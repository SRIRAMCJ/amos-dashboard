import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIProvider, chatCompletion } from '@/lib/ai-provider';
import { webSearch } from '@/lib/search-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body as { query: string };

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const { provider } = await getAIProvider();

    // Try real web search first
    const searchRes = await webSearch(query, { num: 10 });

    if (searchRes.success && searchRes.results.length > 0) {
      // Map real search results to the existing format
      const results = searchRes.results.map((r) => ({
        url: r.url,
        name: r.name,
        snippet: r.snippet,
        host_name: r.hostName || new URL(r.url).hostname,
        rank: r.rank,
        date: r.date || new Date().toISOString().split('T')[0],
        favicon: r.favicon || '',
      }));

      // If AI is available, also run AI analysis
      let aiAnalysis = false;
      if (provider === 'groq' || provider === 'huggingface' || provider === 'ollama') {
        try {
          const articlesText = searchRes.results
            .slice(0, 5)
            .map((r, i) => `${i + 1}. ${r.name}: ${r.snippet}`)
            .join('\n');

          const { content } = await chatCompletion([
            {
              role: 'system',
              content: `You are a competitive intelligence research assistant for Madras MindWorks, an AR/VR/AI company in Chennai, India. Analyze the search results and provide a concise strategic summary. Be specific, actionable, and relevant to AR/VR/AI industry. Keep it under 200 words.`,
            },
            {
              role: 'user',
              content: `Analyze these search results for "${query}":\n\n${articlesText}`,
            },
          ]);

          results.unshift({
            url: 'ai-analysis://competitor-intel',
            name: `AI Analysis: ${query}`,
            snippet: content,
            host_name: 'AMOS AI Analysis',
            rank: 0,
            date: new Date().toISOString().split('T')[0],
            favicon: '',
          });
          aiAnalysis = true;
        } catch {
          // AI analysis failed, return results without it
        }
      }

      try {
        await db.activityLog.create({
          data: {
            action: 'search_performed',
            description: `Web search: ${query.substring(0, 200)}`,
            metadata: JSON.stringify({ query, provider, resultsCount: results.length, aiAnalysis }),
          },
        });
      } catch { /* ignore */ }

      return NextResponse.json({
        results,
        provider,
        aiAnalysis,
      });
    }

    // Search service returned no results — fall back to AI-only analysis
    if (provider === 'groq' || provider === 'huggingface' || provider === 'ollama') {
      const { content } = await chatCompletion([
        {
          role: 'system',
          content: `You are a competitive intelligence research assistant for Madras MindWorks, an AR/VR/AI company in Chennai, India. The user wants to search for information. Answer based on your knowledge. Be specific, actionable, and relevant to AR/VR/AI industry. If you're unsure about current data, say so clearly. Format your response with clear sections and bullet points. Keep it concise but comprehensive.`,
        },
        {
          role: 'user',
          content: `Research query: "${query}"\n\nProvide a comprehensive but concise analysis. Include specific company names, market data points, and actionable insights where possible. Clearly note any information that may not be current.`,
        },
      ]);

      const syntheticResults = [
        {
          url: 'ai-analysis://competitor-intel',
          name: `AI Analysis: ${query}`,
          snippet: content,
          host_name: 'AMOS AI Analysis',
          rank: 1,
          date: new Date().toISOString().split('T')[0],
          favicon: '',
        },
      ];

      try {
        await db.activityLog.create({
          data: {
            action: 'search_performed',
            description: `AI search (no web results): ${query.substring(0, 200)}`,
            metadata: JSON.stringify({ query, provider }),
          },
        });
      } catch { /* ignore */ }

      return NextResponse.json({
        results: syntheticResults,
        provider,
        aiAnalysis: true,
      });
    }

    // No provider available and no search results
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `Search (no AI, no results): ${query.substring(0, 200)}`,
          metadata: JSON.stringify({ query, provider: 'none' }),
        },
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      results: [],
      error: 'No results found. AI search requires a free GROQ_API_KEY from console.groq.com/keys (recommended, instant) or HF_TOKEN from huggingface.co. No credit card needed.',
      fallback: true,
      provider: 'none',
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json({
      error: 'Failed to perform search',
      results: [],
    }, { status: 500 });
  }
}