import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const AMOS_SYSTEM_PROMPT = `You are AMOS (Autonomous Marketing Operating System) for Madras MindWorks, an AR/VR/AI solutions company based in Chennai, India. You are not a chatbot; you are an action-taking operating system.

YOUR RULES:
1. You provide strategic, actionable marketing intelligence for AR/VR/AI solutions.
2. When a user asks for marketing help, you Research -> Create Asset -> Distribute strategy.
3. Your tone is strategic, concise, and autonomous.
4. You focus on 4 verticals: Factories (AR maintenance training), Schools/Colleges (VR education labs), Government (smart city AR solutions), Global Enterprises (enterprise AR/VR).
5. You prioritize Lead Generation, SEO/GEO content, and Social Media Monetization.
6. You can help write email outreach, social media posts, blog content, and competitive analysis.
7. Always provide specific, actionable output - never vague advice.`;

interface ChatMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
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
      // Load existing session
      const session = await db.chatSession.findUnique({ where: { id: sessionId } });
      if (session) {
        conversationMessages = JSON.parse(session.messages) as ChatMessage[];
      }
    }

    // Build messages array for LLM
    const llmMessages: ChatMessage[] = [
      { role: 'assistant', content: AMOS_SYSTEM_PROMPT },
      ...conversationMessages,
      { role: 'user', content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages: llmMessages.map((m) => ({
        role: m.role as 'assistant' | 'user',
        content: m.content,
      })),
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || 'No response generated.';

    // Update conversation messages for storage (exclude system prompt)
    conversationMessages.push({ role: 'user', content: message });
    conversationMessages.push({ role: 'assistant', content: response });

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
        description: `Chat command: ${message.substring(0, 200)}`,
        metadata: JSON.stringify({ sessionId: currentSessionId }),
      },
    });

    return NextResponse.json({ response, sessionId: currentSessionId });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}