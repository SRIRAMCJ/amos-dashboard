import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeUrl } from '@/lib/scraper-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, extractLinks } = body as { url: string; extractLinks?: boolean };

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const result = await scrapeUrl(url, { extractLinks: extractLinks ?? false });

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `Scraped: ${url.substring(0, 200)}`,
          metadata: JSON.stringify({ url, success: result.success }),
        },
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}