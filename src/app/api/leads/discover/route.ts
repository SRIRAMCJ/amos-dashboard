import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch } from '@/lib/search-client';
import { scrapeUrl } from '@/lib/scraper-client';
import { chatCompletion } from '@/lib/ai-provider';
import type { ResearchSource } from '@/lib/rag-pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, vertical, saveToDb } = body as {
      query: string;
      vertical?: string;
      saveToDb?: boolean;
    };

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const sources: ResearchSource[] = [];
    let contextData = '';

    // Step 1: Search for businesses
    const searchQuery = vertical
      ? `${query} ${vertical} AR VR services company contact`
      : `${query} AR VR services company contact`;
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

    // Step 2: Scrape top 3 results
    const urlsToScrape = searchRes.results?.slice(0, 3).map((r) => r.url) || [];
    for (const url of urlsToScrape) {
      const scrapeRes = await scrapeUrl(url, { extractLinks: false });
      if (scrapeRes.success && scrapeRes.data) {
        const page = scrapeRes.data;
        sources.push({
          type: 'scraped',
          title: page.title,
          url: page.url,
          snippet: page.description || page.content.slice(0, 200),
        });
        contextData += `## Scraped: ${page.title}\n\n${page.content.slice(0, 3000)}\n\n`;
      }
    }

    // Step 3: AI to identify and structure leads
    const { content } = await chatCompletion([
      {
        role: 'system',
        content: `You are a lead research specialist for Madras MindWorks, an AR/VR/AI company in Chennai, India.

Based on the collected data, identify potential leads (businesses that could benefit from AR/VR services).

For each lead, provide:
- name: Business/company name
- email: Contact email (if found in data)
- company: Full company name
- phone: Phone number (if found)
- website: Website URL
- vertical: One of: Factories, Schools/Colleges, Government, Global Enterprises
- source: How you found this lead
- notes: Why this is a good lead for AR/VR services (1-2 sentences)
- score: Fit score 1-10 for AR/VR services

Return ONLY valid JSON array. No markdown code blocks. Example:
[{"name":"...","email":"...","company":"...","phone":null,"website":"...","vertical":"...","source":"...","notes":"...","score":8}]`,
      },
      {
        role: 'user',
        content: `Find leads for: "${query}"${vertical ? ` in vertical: ${vertical}` : ''}\n\n## Collected Data\n\n${contextData || 'No real-time data available. Use your knowledge.'}`,
      },
    ], { maxTokens: 4096 });

    // Parse leads
    let leads: Array<{
      name: string;
      email?: string;
      company: string;
      phone?: string;
      website: string;
      vertical: string;
      source: string;
      notes: string;
    }> = [];

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      leads = JSON.parse(cleaned);
    } catch {
      leads = [];
    }

    // Step 4: Optionally save to database
    if (saveToDb && leads.length > 0) {
      for (const lead of leads) {
        try {
          await db.lead.create({
            data: {
              name: lead.name || lead.company || 'Unknown',
              email: lead.email || `${lead.name?.toLowerCase().replace(/\s+/g, '.')}@example.com`,
              company: lead.company || lead.name || '',
              phone: lead.phone || null,
              vertical: lead.vertical || vertical || null,
              source: 'AMOS',
              notes: lead.notes || null,
            },
          });
        } catch {
          /* skip duplicates or errors */
        }
      }
    }

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'lead_created',
          description: `Lead discovery: ${query.substring(0, 200)}`,
          metadata: JSON.stringify({ query, vertical, leadsFound: leads.length, saved: !!saveToDb }),
        },
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      leads,
      sources,
    });
  } catch (error) {
    console.error('Lead discovery error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}