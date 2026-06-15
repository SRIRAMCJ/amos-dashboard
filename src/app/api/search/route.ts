import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body as { query: string };

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', { query, num: 10 });

    // Log the activity
    await db.activityLog.create({
      data: {
        action: 'search_performed',
        description: `Web search: ${query.substring(0, 200)}`,
        metadata: JSON.stringify({ query, resultCount: Array.isArray(results) ? results.length : 0 }),
      },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}