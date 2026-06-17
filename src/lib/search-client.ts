/**
 * Search Client
 *
 * Calls the search-service mini-service (port 8082) for web search.
 * Falls back gracefully if the service is unavailable.
 */

export interface SearchResult {
  url: string;
  name: string;
  snippet: string;
  hostName: string;
  rank: number;
  date: string;
  favicon: string;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:8082';

export async function webSearch(
  query: string,
  options?: { num?: number; recencyDays?: number }
): Promise<SearchResponse> {
  try {
    const url = `${SEARCH_SERVICE_URL}/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        num: options?.num || 10,
        recencyDays: options?.recencyDays,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Search service error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(
      '[Search Client] Service unavailable:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { success: false, results: [], error: 'Search service unavailable' };
  }
}