import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch } from '@/lib/search-client';
import { chatCompletion } from '@/lib/ai-provider';
import type { ResearchSource } from '@/lib/rag-pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, recencyDays } = body as { topic: string; recencyDays?: number };

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const sources: ResearchSource[] = [];

    // Step 1: Search for recent news
    const searchRes = await webSearch(topic, {
      num: 10,
      recencyDays: recencyDays || 7,
    });

    let articles: Array<{
      title: string;
      url: string;
      snippet: string;
      date: string;
      source: string;
    }> = [];

    if (searchRes.success && searchRes.results.length > 0) {
      articles = searchRes.results.map((r) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
        date: r.date || '',
        source: r.hostName || new URL(r.url).hostname,
      }));

      for (const r of searchRes.results) {
        sources.push({
          type: 'web',
          title: r.name,
          url: r.url,
          snippet: r.snippet,
        });
      }
    }

    // Step 2: AI summary
    const articlesText = articles
      .map((a, i) => `${i + 1}. **${a.title}** (${a.source}, ${a.date})\n   ${a.snippet}`)
      .join('\n\n');

    const { content: summary } = await chatCompletion([
      {
        role: 'system',
        content: 'You are an industry news analyst for Madras MindWorks (AR/VR/AI company). Summarize the latest news concisely, highlighting what matters for an AR/VR business. Use bullet points. Keep it under 300 words.',
      },
      {
        role: 'user',
        content: `Summarize these news articles about "${topic}":\n\n${articlesText || 'No articles found.'}`,
      },
    ], { maxTokens: 2048 });

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `News intelligence: ${topic.substring(0, 200)}`,
          metadata: JSON.stringify({ topic, recencyDays, articlesCount: articles.length }),
        },
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      articles,
      summary,
      sources,
    });
  } catch (error) {
    console.error('News intelligence error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}