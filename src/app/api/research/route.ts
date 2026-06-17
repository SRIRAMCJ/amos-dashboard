import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { researchAndAnswer } from '@/lib/rag-pipeline';

const TODAY = new Date().toLocaleDateString('en-IN', {
  timeZone: 'Asia/Calcutta',
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
});

const SYSTEM_PROMPT = `You are AMOS (Autonomous Marketing Operating System) for Madras MindWorks — an AR/VR/AI solutions company based in Chennai, India. Today's date is ${TODAY}.

COMPANY: Madras MindWorks, Chennai, India. Domain: AR, VR, AI solutions.
TARGET VERTICALS: (1) Factories — AR maintenance & training, (2) Schools/Colleges — VR education labs, (3) Government — smart city AR, (4) Global Enterprises — enterprise AR/VR.
SERVICES: AR/VR experience design, custom software, training simulations, virtual showrooms, digital twins.

RULES:
1. NEVER fabricate client names, requirements, dates, or market data.
2. For specific companies/tenders, clearly state your info may not be current and recommend verification.
3. Current year is ${new Date().getFullYear()}. Don't use past dates as "current".
4. Provide strategic, actionable marketing intelligence.
5. Tone: Strategic, concise, autonomous, professional. You are an operating system, not a chatbot.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, conversationHistory } = body as {
      query: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const result = await researchAndAnswer(query, {
      systemPrompt: SYSTEM_PROMPT,
      conversationHistory,
      forceSearch: true,
      maxSearchResults: 8,
      maxScrapePages: 3,
    });

    // Log to activity
    try {
      await db.activityLog.create({
        data: {
          action: 'search_performed',
          description: `Deep research: ${query.substring(0, 200)}`,
          metadata: JSON.stringify({
            query,
            provider: result.provider,
            stepsCount: result.steps.length,
            sourcesCount: result.sources.length,
          }),
        },
      });
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      steps: result.steps,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Research error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}