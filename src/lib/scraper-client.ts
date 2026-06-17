/**
 * Scraper Client
 *
 * Calls the scraper mini-service (port 8083) for web page scraping.
 * Falls back gracefully if the service is unavailable.
 */

export interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  content: string;
  headings: string[];
  links: Array<{ text: string; href: string }>;
  metadata: {
    wordCount: number;
    language: string | null;
  };
}

export interface ScrapeResponse {
  success: boolean;
  data?: ScrapedPage;
  error?: string;
}

const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:8083';

export async function scrapeUrl(
  url: string,
  options?: { extractLinks?: boolean }
): Promise<ScrapeResponse> {
  try {
    const res = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, extractLinks: options?.extractLinks ?? true }),
      signal: AbortSignal.timeout(process.env.NODE_ENV === 'production' ? 3000 : 30000),
    });
    if (!res.ok) throw new Error(`Scraper service error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(
      '[Scraper Client] Service unavailable:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { success: false, error: 'Scraper service unavailable' };
  }
}

export async function scrapeBatch(
  urls: string[]
): Promise<Array<{ url: string; success: boolean; data?: ScrapedPage; error?: string }>> {
  try {
    const res = await fetch(`${SCRAPER_SERVICE_URL}/scrape-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
      signal: AbortSignal.timeout(process.env.NODE_ENV === 'production' ? 5000 : 60000),
    });
    if (!res.ok) throw new Error(`Scraper batch error: ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.warn(
      '[Scraper Client] Batch service unavailable:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return urls.map((url) => ({ url, success: false, error: 'Scraper service unavailable' }));
  }
}