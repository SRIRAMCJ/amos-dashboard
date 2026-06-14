import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const GENERATION_PROMPTS: Record<string, string> = {
  email: `You are AMOS, the Autonomous Marketing Operating System for Madras MindWorks (AR/VR/AI solutions, Chennai, India). Write a professional cold outreach email for AR/VR services. The email should be:
- Personalized and concise
- Focus on business value and ROI
- Include a clear call to action
- Professional but not stiff
- Mention Madras MindWorks as the sender

Context: {context}`,

  social_linkedin: `You are AMOS, the Autonomous Marketing Operating System for Madras MindWorks (AR/VR/AI solutions, Chennai, India). Write a LinkedIn post that:
- Is engaging and professional
- Uses relevant hashtags
- Showcases AR/VR/AI expertise
- Drives engagement and lead generation
- Is under 300 words

Context: {context}`,

  social_twitter: `You are AMOS, the Autonomous Marketing Operating System for Madras MindWorks (AR/VR/AI solutions, Chennai, India). Write a Twitter/X post that:
- Is punchy and engaging (under 280 characters)
- Uses 2-3 relevant hashtags
- Creates curiosity about AR/VR/AI solutions
- Drives clicks and engagement

Context: {context}`,

  blog: `You are AMOS, the Autonomous Marketing Operating System for Madras MindWorks (AR/VR/AI solutions, Chennai, India). Write an SEO-optimized blog post draft that:
- Has a compelling, keyword-rich title
- Includes H2 and H3 subheadings
- Is 800-1500 words
- Targets relevant SEO keywords for AR/VR/AI industry
- Provides genuine value and actionable insights
- Ends with a soft CTA for Madras MindWorks

Context: {context}`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, context, platform } = body as {
      type: 'email' | 'social' | 'blog';
      context: string;
      platform?: string;
    };

    if (!type || !context) {
      return NextResponse.json(
        { error: 'type and context are required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Determine the prompt key
    let promptKey: string;
    if (type === 'social') {
      promptKey = platform === 'Twitter' ? 'social_twitter' : 'social_linkedin';
    } else {
      promptKey = type;
    }

    const systemPrompt = GENERATION_PROMPTS[promptKey]?.replace('{context}', context) || GENERATION_PROMPTS.email.replace('{context}', context);

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Generate the ${type} content based on the provided context.` },
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion.choices[0]?.message?.content || 'Failed to generate content.';

    // For blog posts, try to extract a title from the first line
    let title: string | undefined;
    if (type === 'blog') {
      const lines = content.split('\n').filter((l: string) => l.trim());
      if (lines.length > 0) {
        title = lines[0].replace(/^#+\s*/, '').trim();
      }
    }

    // Log the activity
    await db.activityLog.create({
      data: {
        action: 'ai_generated',
        description: `AI generated ${type} content${platform ? ` for ${platform}` : ''}`,
        metadata: JSON.stringify({ type, platform, title }),
      },
    });

    return NextResponse.json({ content, title });
  } catch (error) {
    console.error('Error generating AI content:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}