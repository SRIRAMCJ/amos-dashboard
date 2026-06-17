import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIProvider } from '@/lib/ai-provider';
import { researchAndAnswer } from '@/lib/rag-pipeline';

const TODAY = new Date().toLocaleDateString('en-IN', {
  timeZone: 'Asia/Calcutta',
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
});

const SYSTEM_PROMPT = `You are AMOS — a helpful AI assistant for Madras MindWorks, an AR/VR/AI solutions company based in Chennai, India. Today's date is ${TODAY}.

COMPANY CONTEXT (for reference only):
- Company: Madras MindWorks, Chennai, India
- Domain: AR, VR, AI solutions
- Target Verticals: Factories (AR maintenance/training), Schools/Colleges (VR education labs), Government (smart city AR), Global Enterprises
- Services: AR/VR experience design, custom software, training simulations, virtual showrooms, digital twins

CRITICAL RESPONSE RULES:
1. ANSWER WHAT THE USER ACTUALLY ASKS. If they ask a question, answer it directly. If they ask for research, do research. If they ask for help, help them.
2. NEVER generate email content, outreach messages, or marketing copy UNLESS the user explicitly asks you to write an email, draft a message, or create marketing content.
3. NEVER output email subject lines, recipient fields, or email formatting unless specifically requested.
4. Do NOT assume every question is about email outreach. The user may ask about technology, competitors, strategies, general knowledge, or anything else.
5. NEVER fabricate client names, requirements, dates, or market data.
6. For specific companies/tenders, clearly state your info may not be current and recommend verification.
7. Current year is ${new Date().getFullYear()}. Don't use past dates as "current".
8. Tone: Helpful, concise, professional. Respond as an intelligent assistant, not a marketing robot.
9. Format responses with markdown when helpful (headers, bullet points, bold text).
10. If search results are provided as context, use them to give accurate, sourced answers. Cite sources with links.`;

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json() as { message: string; sessionId?: string };
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });

    const { provider } = await getAIProvider();

    // Load existing session
    let currentSessionId = sessionId;
    let history: ChatMessage[] = [];
    if (sessionId) {
      try {
        const session = await db.chatSession.findUnique({ where: { id: sessionId } });
        if (session) history = JSON.parse(session.messages) as ChatMessage[];
      } catch { /* ignore */ }
    }

    // No AI available → fallback
    if (provider === 'none') {
      const fb = `I'm running in a limited environment without an AI engine. Here's what I can suggest about **"${message.substring(0, 80)}"**:

• **AR/VR Tenders**: Check Tamil Nadu e-Procurement (tneprocurement.tn.gov.in) and GeM (gem.gov.in)
• **Education**: CBSE/state boards adopting VR labs — approach schools with demos
• **Manufacturing**: TVS, Hyundai, Renault in Chennai are prime AR training targets
• **Smart City**: Chennai Smart City projects include AR/VR components

> 💡 **To enable AI chat:** Get a free API key from [Groq](https://console.groq.com/keys) (no credit card needed, instant responses) and add it as \`GROQ_API_KEY\` in your Vercel environment variables.

Would you like guidance on any of these areas?`;

      try {
        const s = await db.chatSession.create({
          data: { messages: JSON.stringify([{ role: 'user', content: message }, { role: 'assistant', content: fb }]) },
        });
        currentSessionId = s.id;
      } catch { /* ignore */ }

      return NextResponse.json({ response: fb, sessionId: currentSessionId, searchPerformed: false, aiProvider: 'none' });
    }

    // AI available — use RAG pipeline for full search → scrape → analyze
    const result = await researchAndAnswer(message, {
      systemPrompt: SYSTEM_PROMPT,
      conversationHistory: history,
    });

    const { answer, sources, steps, provider: ragProvider } = result;

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: answer });

    try {
      if (currentSessionId) {
        await db.chatSession.update({ where: { id: currentSessionId }, data: { messages: JSON.stringify(history) } });
      } else {
        const s = await db.chatSession.create({ data: { messages: JSON.stringify(history) } });
        currentSessionId = s.id;
      }
      await db.activityLog.create({
        data: { action: 'chat_command', description: `Chat: ${message.substring(0, 200)}`, metadata: JSON.stringify({ provider: ragProvider, searchPerformed: steps.some(s => s.type === 'search') }) },
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      response: answer,
      sessionId: currentSessionId,
      searchPerformed: steps.some(s => s.type === 'search'),
      aiProvider: ragProvider,
      sources,
      steps,
    });
  } catch (error) {
    console.error('Chat error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof Error && error.message === 'NO_AI_PROVIDER') {
      return NextResponse.json({
        response: `AI is not available. Set \`GROQ_API_KEY\` or \`HF_TOKEN\` env var to enable AI chat.\n\n**Recommended (fastest):** Get a free Groq key from https://console.groq.com/keys\n**Alternative:** Get a free HF token from https://huggingface.co/settings/tokens\n\nNo credit card required for either.\n\nMeanwhile, use the sidebar to manage leads, emails, social posts, and blogs!`,
        sessionId: null, searchPerformed: false, aiProvider: 'none',
      });
    }
    // Check for timeout (Vercel hobby plan 10s limit vs HF cold start)
    const isTimeout = errMsg.includes('timeout') || errMsg.includes('TIMEOUT') || errMsg.includes('504');
    const isHFLoading = errMsg.includes('503') || errMsg.includes('loading');
    const userMsg = isTimeout || isHFLoading
      ? `⚠️ The AI model is loading (cold start). Please try again in 30 seconds — subsequent responses will be instant.\n\n**For instant responses:** Add a free \`GROQ_API_KEY\` from https://console.groq.com/keys — no cold starts, sub-second replies.\n\n_Technical detail: ${errMsg}_`
      : `⚠️ AI encountered an error. Please try again.\n\n_Detail: ${errMsg}_`;
    return NextResponse.json({ error: errMsg, response: userMsg }, { status: 500 });
  }
}