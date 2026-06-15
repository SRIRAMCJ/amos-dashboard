import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Current date context — updated automatically
const TODAY = new Date().toLocaleDateString('en-IN', {
  timeZone: 'Asia/Calcutta',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const AMOS_SYSTEM_PROMPT = `You are AMOS (Autonomous Marketing Operating System) for Madras MindWorks — an AR/VR/AI solutions company based in Chennai, India. Today's date is ${TODAY}.

COMPANY IDENTITY:
- Company: Madras MindWorks, Chennai, India
- Domain: AR (Augmented Reality), VR (Virtual Reality), AI solutions
- Target Verticals: (1) Factories — AR maintenance & training, (2) Schools/Colleges — VR education labs, (3) Government — smart city AR, (4) Global Enterprises — enterprise AR/VR
- Services: AR/VR experience design, custom software development, training simulations, virtual showrooms, digital twins

CRITICAL RULES — YOU MUST FOLLOW THESE:
1. NEVER fabricate, guess, or hallucinate client names, requirements, dates, tender deadlines, or market data.
2. When discussing ANY specific client, company, tender, market trend, or requirement — ALWAYS use the web search results provided to you as context. If no search results were provided, say "Let me search for the latest information" and ask the user to rephrase their query so the system can trigger a search.
3. NEVER use dates from past years (2023, 2024) as "current" or "upcoming". The current year is ${new Date().getFullYear()}. Any requirement you mention MUST be from 2025 or later.
4. When given web search results, cite the source (website name) and only state what the search results actually say. Do not embellish.
5. If a user asks about a specific company (e.g. "TVS Motor", "Tata Steel"), you MUST have web search context to provide accurate, current information. Never make up requirements or timelines for real companies.
6. Provide strategic, actionable marketing intelligence — not generic advice.
7. Your Research → Create Asset → Distribute framework: Research the client/market, create tailored content, suggest distribution channels.
8. Tone: Strategic, concise, autonomous, professional. You are an operating system, not a chatbot.
9. You can help write email outreach, social media posts, blog content, competitive analysis, and client research.
10. When listing potential clients or prospects, always note that the list is based on the latest available information and recommend verifying through direct contact.`;

// Keywords that should trigger web search
const SEARCH_TRIGGERS = [
  // Client research
  /(?:find|search|research|look up|look into|info about|details? about|tell me about|who are|what are|list of|get me|show me|fetch|identify|discover)\s+/i,
  /(?:clients?|prospects?|companies?|enterprises?|organizations?|corporations?|industries?|factories?|schools?|colleges?|hospitals?|government|leads?|requirements?|problem statements?)/i,
  /(?:tender|procurement|rfp|rfa|eoi|expression of interest|rfq|proposal|bid)/i,
  // Specific company names (common Indian companies that might be AR/VR prospects)
  /(?:TVS|Tata|Reliance|Infosys|Wipro|Mahindra|Bajaj|Hero|Ashok Leyland|L&T|Hyundai|Ford|BMW|Audi|Mercedes|IIT|IIM|NIT|AIIMS|Apollo|Fortis|NTPC|BHEL|SAIL|HAL|BEL|ISRO|DRDO|DMRC|Metro|Smart City|Corporation|Municipal)/i,
  // Market & competitor
  /(?:competitor|market (?:size|trend|report|analysis)|industry (?:report|overview))/i,
  /(?:AR|VR|XR|augmented reality|virtual reality|extended reality|mixed reality|spatial computing|metaverse)\s+(?:market|industry|trend|adoption|growth|companies?|vendors?|providers?)/i,
  // Geography
  /(?:in (?:Chennai|Tamil Nadu|India|Bangalore|Karnataka|Hyderabad|Delhi|Mumbai|Pune|Kerala|Kolkata))/i,
  /(?:upcoming|latest|current|recent|new|active|ongoing)/i,
  // Email / contact
  /(?:email (?:id|address|of)|contact (?:info|details?|of)|who to (?:contact|reach|email))/i,
];

function shouldTriggerSearch(message: string): boolean {
  return SEARCH_TRIGGERS.some((pattern) => pattern.test(message));
}

interface ChatMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

// Domain-relevant keywords to check search result quality
const RELEVANCE_KEYWORDS = [
  'ar/', 'vr/', 'xr/', 'augmented reality', 'virtual reality', 'mixed reality',
  'extended reality', 'spatial computing', 'metaverse', 'immersive',
  'tender', 'procurement', 'rfp', 'rfq', 'eoi', 'bid',
  'training simulation', 'digital twin', '3d', 'hmd', 'headset',
  'smart city', 'smart classroom', 'vr lab', 'ar lab',
  'industrial ', 'manufacturing ', 'factory ', 'plant ',
  'school', 'college', 'university', 'education',
  'government', 'municipal', 'corporation', 'public sector',
  'chennai', 'tamil nadu', 'india', 'bengaluru', 'hyderabad',
  'enterprise', 'b2b', 'solution provider', 'vendor',
];

function areResultsRelevant(results: Array<{ snippet?: string; name?: string; url?: string; host_name?: string }>): boolean {
  if (!results || results.length === 0) return false;
  const text = results
    .map((r) => `${r.name || ''} ${r.snippet || ''} ${r.host_name || ''} ${r.url || ''}`)
    .join(' ')
    .toLowerCase();
  const matchCount = RELEVANCE_KEYWORDS.filter((kw) => text.includes(kw)).length;
  return matchCount >= 2;
}

async function performWebSearch(query: string): Promise<{ context: string; results: Array<{ snippet?: string; name?: string; url?: string; host_name?: string; date?: string }> }> {
  try {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', { query, num: 10 }) as Array<Record<string, string>>;

    if (!Array.isArray(results) || results.length === 0) {
      return { context: '', results: [] };
    }

    return { context: formatSearchResults(results), results };
  } catch (error) {
    console.error('Web search failed:', error);
    return { context: '', results: [] };
  }
}

function formatSearchResults(results: Array<Record<string, string>>): string {
  const formatted = results
    .slice(0, 8)
    .map((r, i) => {
      const source = r.host_name || r.name || (r.url ? new URL(r.url).hostname : 'Unknown');
      const date = r.date ? ` (${r.date})` : '';
      return `[${i + 1}] ${r.name || 'Untitled'}${date}\n    Source: ${source}\n    ${r.snippet || 'No description available.'}`;
    })
    .join('\n\n');

  return `WEB SEARCH RESULTS (live data, use as your primary source):\n\n${formatted}\n\nINSTRUCTIONS: Use ONLY the above search results to answer. Cite source names. Do not fabricate information not found in the results. If the results are insufficient, say so and suggest a more specific search query.`;
}

function generateSearchQueries(message: string): string[] {
  const lower = message.toLowerCase();
  const year = new Date().getFullYear();

  // Extract the core topic by removing common verbs
  const topic = message
    .replace(/^(?:find|search|research|look (?:up|into|for)|get me|show me|fetch|identify|discover|list|tell me about|what are|who are|can you|please)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();

  const queries: string[] = [];

  // Query 1: Direct topic + AR/VR domain + year
  queries.push(`${topic} AR VR ${year} India`);

  // Detect intent and build specialized queries
  if (/tender|procurement|rfp|rfq|eoi|bid|proposal/i.test(lower)) {
    queries.push(`AR VR tender ${year} Tamil Nadu India government procurement`);
    queries.push(`augmented reality virtual reality RFP ${year} India education manufacturing`);
  }

  if (/client|prospect|lead|requirement|problem statement/i.test(lower)) {
    queries.push(`AR VR clients requirements ${year} India manufacturing education`);
    queries.push(`companies looking for AR VR solutions ${year} India enterprise`);
  }

  if (/email|contact|reach out/i.test(lower)) {
    queries.push(`${topic} contact email CTO innovation head ${year}`);
  }

  if (/competitor|market/i.test(lower)) {
    queries.push(`AR VR companies India ${year} market share competitors`);
  }

  if (/factory|manufacturing|industrial|plant/i.test(lower)) {
    queries.push(`AR VR manufacturing training India ${year} factory digital twin`);
  }

  if (/school|college|education|university/i.test(lower)) {
    queries.push(`VR education lab setup India ${year} school college smart classroom`);
  }

  if (/government|smart city|municipal/i.test(lower)) {
    queries.push(`AR VR smart city India ${year} government tender digital transformation`);
  }

  // Ensure at least 2 queries
  if (queries.length < 2) {
    queries.push(`AR VR AI solutions ${year} Chennai Tamil Nadu India`);
  }

  return queries;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body as { message: string; sessionId?: string };

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const zai = await ZAI.create();

    let currentSessionId = sessionId;
    let conversationMessages: ChatMessage[] = [];

    if (sessionId) {
      const session = await db.chatSession.findUnique({ where: { id: sessionId } });
      if (session) {
        conversationMessages = JSON.parse(session.messages) as ChatMessage[];
      }
    }

    // Determine if web search is needed
    const needsSearch = shouldTriggerSearch(message);
    let searchContext = '';
    let searchQueryUsed = '';

    if (needsSearch) {
      const queries = generateSearchQueries(message);

      // Try queries in order until we get relevant results
      for (const query of queries) {
        const { context, results } = await performWebSearch(query);
        searchQueryUsed = query;

        if (context && areResultsRelevant(results)) {
          searchContext = context;
          break;
        }

        // If no relevance filter passed but we got results, use them if it's the last query
        if (!searchContext && query === queries[queries.length - 1] && context) {
          searchContext = context;
        }
      }
    }

    // Build messages array for LLM
    const llmMessages: ChatMessage[] = [
      { role: 'assistant', content: AMOS_SYSTEM_PROMPT },
      ...conversationMessages,
    ];

    // If we have search results, inject them as a system-like context before the user message
    if (searchContext) {
      llmMessages.push({
        role: 'assistant',
        content: `[AMOS performed a live web search]\nSearch query: "${searchQueryUsed}"\n\n${searchContext}`,
      });
    } else if (needsSearch) {
      // Search was triggered but returned no relevant results — tell the LLM
      llmMessages.push({
        role: 'assistant',
        content: `[AMOS attempted a web search but could not find relevant results. The search queries tried were domain-specific to AR/VR/AI. Do NOT fabricate any data. Instead, acknowledge the limitation and suggest the user try a more specific query or use the Competitor Intel section for manual searches.]`,
      });
    }

    llmMessages.push({ role: 'user', content: message });

    const completion = await zai.chat.completions.create({
      messages: llmMessages.map((m) => ({
        role: m.role as 'assistant' | 'user',
        content: m.content,
      })),
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || 'No response generated.';

    // Update conversation messages for storage (exclude system prompt and search context)
    conversationMessages.push({ role: 'user', content: message });

    // If search was performed, prepend a note to the response for context
    const finalResponse = needsSearch && searchContext
      ? response
      : response;

    conversationMessages.push({ role: 'assistant', content: finalResponse });

    // Create or update the chat session
    if (currentSessionId) {
      await db.chatSession.update({
        where: { id: currentSessionId },
        data: { messages: JSON.stringify(conversationMessages) },
      });
    } else {
      const newSession = await db.chatSession.create({
        data: { messages: JSON.stringify(conversationMessages) },
      });
      currentSessionId = newSession.id;
    }

    // Log the activity
    await db.activityLog.create({
      data: {
        action: 'chat_command',
        description: `Chat${needsSearch ? ' + web search' : ''}: ${message.substring(0, 200)}`,
        metadata: JSON.stringify({ sessionId: currentSessionId, usedSearch: needsSearch }),
      },
    });

    return NextResponse.json({
      response: finalResponse,
      sessionId: currentSessionId,
      searchPerformed: needsSearch && !!searchContext,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}