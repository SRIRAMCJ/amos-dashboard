import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIProvider, chatCompletion } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body as { query: string };

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const { provider } = await getAIProvider();

    if (provider === 'groq' || provider === 'huggingface') {
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
            description: `AI search: ${query.substring(0, 200)}`,
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

    // No provider available
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `Search (no AI): ${query.substring(0, 200)}`,
          metadata: JSON.stringify({ query, provider: 'none' }),
        },
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      results: [],
      error: 'AI search requires a free GROQ_API_KEY from console.groq.com/keys (recommended, instant) or HF_TOKEN from huggingface.co. No credit card needed.',
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