import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch } from '@/lib/search-client';
import { scrapeUrl } from '@/lib/scraper-client';
import { chatCompletion } from '@/lib/ai-provider';
import type { ResearchSource } from '@/lib/rag-pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, website } = body as { name: string; website?: string };

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const sources: ResearchSource[] = [];
    let contextData = '';

    // Step 1: Search for the competitor
    const searchQuery = `${name} AR VR XR company products services`;
    const searchRes = await webSearch(searchQuery, { num: 10 });

    if (searchRes.success && searchRes.results.length > 0) {
      for (const r of searchRes.results.slice(0, 8)) {
        sources.push({
          type: 'web',
          title: r.name,
          url: r.url,
          snippet: r.snippet,
        });
        contextData += `### ${r.name}\n${r.snippet}\nSource: ${r.url}\n\n`;
      }
    }

    // Step 2: Scrape the website if provided
    const scrapeUrl_target = website || searchRes.results?.[0]?.url;
    if (scrapeUrl_target) {
      const scrapeRes = await scrapeUrl(scrapeUrl_target, { extractLinks: false });
      if (scrapeRes.success && scrapeRes.data) {
        const page = scrapeRes.data;
        sources.push({
          type: 'scraped',
          title: page.title,
          url: page.url,
          snippet: page.description || page.content.slice(0, 200),
        });
        contextData += `\n## Scraped: ${page.title}\n\n${page.content.slice(0, 6000)}\n\n`;
      }
    }

    // Step 3: AI analysis with SWOT
    const systemPrompt = `You are a competitive intelligence analyst for Madras MindWorks, an AR/VR/AI company in Chennai, India.

Analyze the following competitor based ONLY on the collected data below. Do NOT fabricate or guess information.

Your analysis MUST include:
1. **Market Position**: Where does this company stand in the AR/VR market?
2. **Strengths**: What are their key advantages? (list 3-5)
3. **Weaknesses**: What are their gaps or limitations? (list 3-5)
4. **Opportunities**: What market opportunities could Madras MindWorks exploit relative to this competitor? (list 3-5)
5. **Threats**: How does this competitor threaten Madras MindWorks? (list 3-5)
6. **Suggested Strategy**: Actionable recommendations for Madras MindWorks to compete effectively (3-5 specific strategies)

Format your response as structured JSON with these keys:
{
  "analysis": "Full narrative analysis (2-3 paragraphs)",
  "marketPosition": "Market position assessment",
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "opportunities": ["opp1", "opp2", ...],
  "threats": ["threat1", "threat2", ...],
  "suggestedStrategy": "Detailed strategy recommendations"
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    const userPrompt = contextData
      ? `Analyze this competitor: **${name}**\n\n## Collected Data\n\n${contextData}`
      : `Analyze this competitor: **${name}** based on your knowledge. Note that no real-time data was available.`;

    const { content } = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { maxTokens: 4096 });

    // Parse the AI response
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        analysis: content,
        marketPosition: 'Unable to determine from available data',
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        suggestedStrategy: content,
      };
    }

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `Competitor analysis: ${name}`,
          metadata: JSON.stringify({ name, website, sourcesCount: sources.length }),
        },
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      analysis: parsed.analysis || '',
      sources,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      opportunities: parsed.opportunities || [],
      threats: parsed.threats || [],
      marketPosition: parsed.marketPosition || '',
      suggestedStrategy: parsed.suggestedStrategy || '',
    });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}