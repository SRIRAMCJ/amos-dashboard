import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch } from '@/lib/search-client';
import { scrapeUrl } from '@/lib/scraper-client';
import { chatCompletion } from '@/lib/ai-provider';
import type { ResearchSource } from '@/lib/rag-pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, handle } = body as {
      platform: 'linkedin' | 'twitter' | 'instagram';
      handle: string;
    };

    if (!platform || !handle) {
      return NextResponse.json(
        { error: 'platform and handle are required' },
        { status: 400 }
      );
    }

    const sources: ResearchSource[] = [];
    let contextData = '';

    // Step 1: Search for the social profile
    const cleanHandle = handle.replace('@', '');
    const searchQuery = `${platform} ${cleanHandle} profile`;
    const searchRes = await webSearch(searchQuery, { num: 5 });

    let profileUrl = '';

    if (searchRes.success && searchRes.results.length > 0) {
      for (const r of searchRes.results) {
        sources.push({
          type: 'web',
          title: r.name,
          url: r.url,
          snippet: r.snippet,
        });
        contextData += `### ${r.name}\n${r.snippet}\nSource: ${r.url}\n\n`;
      }

      // Find a profile URL
      profileUrl = searchRes.results.find(
        (r) =>
          r.url.includes(`${platform}.com`) ||
          r.url.includes(`x.com`) ||
          r.url.includes('instagram.com')
      )?.url || searchRes.results[0].url;
    }

    // Step 2: Scrape the profile if found
    if (profileUrl) {
      const scrapeRes = await scrapeUrl(profileUrl, { extractLinks: false });
      if (scrapeRes.success && scrapeRes.data) {
        const page = scrapeRes.data;
        sources.push({
          type: 'scraped',
          title: page.title,
          url: page.url,
          snippet: page.description || page.content.slice(0, 200),
        });
        contextData += `\n## Profile Page: ${page.title}\n\n${page.content.slice(0, 5000)}\n\n`;
      }
    }

    // Step 3: AI analysis
    const { content: analysis } = await chatCompletion([
      {
        role: 'system',
        content: `You are a social media marketing analyst for Madras MindWorks, an AR/VR/AI company in Chennai, India.

Analyze the ${platform} profile "${handle}" based on the collected data.

Provide:
1. **Profile Overview**: Key profile information you can extract
2. **Growth Analysis**: Assessment of their growth patterns
3. **Content Analysis**: What type of content they post, frequency, engagement style
4. **Recommendations**: 5-7 specific, actionable recommendations for this account

Format as JSON:
{
  "analysis": "Full narrative analysis",
  "profileInfo": { "key1": "value1", ... },
  "recommendations": ["rec1", "rec2", ...]
}

Return ONLY valid JSON. No markdown code blocks.`,
      },
      {
        role: 'user',
        content: `Analyze this ${platform} profile: @${cleanHandle}\n\n## Collected Data\n\n${contextData || 'No real-time data available.'}`,
      },
    ], { maxTokens: 4096 });

    let parsed;
    try {
      const cleaned = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        analysis,
        profileInfo: {},
        recommendations: [],
      };
    }

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `Social analysis: ${platform}/${handle}`,
          metadata: JSON.stringify({ platform, handle, sourcesCount: sources.length }),
        },
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      analysis: parsed.analysis || '',
      profileInfo: parsed.profileInfo || {},
      recommendations: parsed.recommendations || [],
      sources,
    });
  } catch (error) {
    console.error('Social analysis error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}