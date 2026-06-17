import ZAI from 'z-ai-web-dev-sdk';

const PORT = 8082;
let zai: InstanceType<typeof ZAI> | null = null;

// Use the async factory to load config from /etc/.z-ai-config
async function initSDK() {
  try {
    zai = await ZAI.create();
    console.log('[search-service] ZAI SDK initialized successfully');
  } catch (err) {
    console.error('[search-service] Failed to initialize ZAI SDK:', err);
  }
}

initSDK();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return Response.json({ status: 'ok', service: 'search' });
    }

    // Search endpoint
    if (url.pathname === '/' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { query, num = 10, recencyDays } = body;

        if (!query || typeof query !== 'string') {
          return Response.json(
            { success: false, error: 'Missing or invalid "query" field' },
            { status: 400 }
          );
        }

        if (!zai) {
          return Response.json(
            { success: false, error: 'ZAI SDK not initialized — check config' },
            { status: 503 }
          );
        }

        const searchParams: Record<string, unknown> = { query, num };
        if (recencyDays !== undefined) {
          searchParams.recency_days = recencyDays;
        }

        const results = await zai.invokeFunction('web_search', searchParams);

        const mapped = (results || []).map((r: Record<string, unknown>) => ({
          url: r.url ?? '',
          name: r.name ?? '',
          snippet: r.snippet ?? '',
          hostName: r.host_name ?? '',
          rank: r.rank ?? 0,
          date: r.date ?? null,
          favicon: r.favicon ?? null,
        }));

        return Response.json({ success: true, results: mapped });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[search-service] Search error:', message);
        return Response.json(
          { success: false, error: `Search failed: ${message}` },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`[search-service] Running on http://localhost:${PORT}`);