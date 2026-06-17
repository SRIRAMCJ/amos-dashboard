import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatCompletion, getAIProvider } from '@/lib/ai-provider';

const GENERATION_PROMPTS: Record<string, string> = {
  email: `You are AMOS, the Autonomous Marketing Operating System for Madras MindWorks (AR/VR/AI solutions, Chennai, India).

CRITICAL RULES:
1. Output ONLY the email body text. Do NOT include a subject line.
2. Do NOT include placeholder text like [industry/field] or [Your Contact Information]. Fill in everything with realistic details.
3. The email must be highly specific to the subject/context provided — NOT a generic template.
4. Keep it concise (150-250 words max).
5. Mention Madras MindWorks as the sender.
6. Include a clear, specific call to action.

Context:
{context}`,

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

// Fallback content when AI is not available
const FALLBACK_CONTENT: Record<string, string> = {
  email: `Dear {recipient_name},

I hope this message finds you well. I'm reaching out from Madras MindWorks, a Chennai-based AR/VR/AI solutions company.

We help organizations like yours leverage immersive technology to:
• Reduce training costs by up to 70% with VR simulations
• Improve maintenance efficiency with AR-guided procedures
• Create engaging customer experiences with interactive 3D content

I'd love to schedule a brief 15-minute call to explore how AR/VR could benefit your specific operations.

Would next Tuesday or Wednesday work for you?

Best regards,
Sriram
Madras MindWorks
Chennai, India`,

  social_linkedin: `🏭 Is your factory still using 2D manuals for maintenance training?

At Madras MindWorks, we're helping manufacturing companies in India transition to AR-guided maintenance and VR training simulations.

The results speak for themselves:
✅ 70% reduction in training time
✅ 45% fewer on-site errors
✅ 3x faster onboarding for new technicians

AR/VR isn't the future — it's the present. Companies that adopt early will have a significant competitive advantage.

#AR #VR #Manufacturing #Industry40 #Training #DigitalTransformation #MadrasMindWorks`,

  social_twitter: `AR/VR in Indian manufacturing is no longer a novelty — it's a competitive necessity. Factories using VR training see 70% faster onboarding and 45% fewer errors. 🏭✨ #AR #VR #Manufacturing #India`,

  blog: `# How AR/VR is Transforming Indian Manufacturing in 2025

## The Manufacturing Revolution is Here

Indian manufacturing is undergoing a dramatic transformation, driven by augmented reality (AR) and virtual reality (VR) technologies. From Chennai's automotive hubs to Pune's industrial corridors, companies are discovering that immersive technology isn't just a buzzword — it's a practical tool delivering measurable ROI.

## AR-Guided Maintenance: A Game Changer

Traditional maintenance procedures rely on thick manuals and experienced technicians. AR-guided maintenance overlays digital instructions directly onto physical equipment, allowing even newer technicians to perform complex procedures with confidence.

### Key Benefits:
- **70% reduction in training time** — New technicians become productive faster
- **45% fewer maintenance errors** — Step-by-step visual guidance reduces mistakes
- **30% reduction in downtime** — Faster, more accurate repairs

## VR Training Simulations

Virtual reality creates fully immersive training environments where workers can practice procedures without risk. From welding simulations to assembly line training, VR provides hands-on experience in a safe, repeatable setting.

## Getting Started with AR/VR

For organizations considering AR/VR adoption, Madras MindWorks recommends starting with a targeted pilot project. Identify one high-impact use case — such as maintenance training or safety demonstrations — and measure the results before scaling.

---
*Madras MindWorks — AR/VR/AI Solutions, Chennai, India*`,
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

    const { provider } = await getAIProvider();

    let content: string;
    let title: string | undefined;
    let usedFallback = false;

    if (provider !== 'none') {
      // AI is available (Groq or HuggingFace)
      let promptKey: string;
      if (type === 'social') {
        promptKey = platform === 'Twitter' ? 'social_twitter' : 'social_linkedin';
      } else {
        promptKey = type;
      }

      const systemPrompt = GENERATION_PROMPTS[promptKey]?.replace('{context}', context) || GENERATION_PROMPTS.email.replace('{context}', context);

      try {
        const { content: generatedContent } = await chatCompletion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the ${type} content based on the provided context.` },
        ]);
        content = generatedContent;
      } catch {
        // AI call failed, fall back to static content
        let fallbackKey: string;
        if (type === 'social') {
          fallbackKey = platform === 'Twitter' ? 'social_twitter' : 'social_linkedin';
        } else {
          fallbackKey = type;
        }
        content = FALLBACK_CONTENT[fallbackKey] || FALLBACK_CONTENT.email;
        usedFallback = true;
      }

      if (type === 'blog') {
        const lines = content.split('\n').filter((l: string) => l.trim());
        if (lines.length > 0) {
          title = lines[0].replace(/^#+\s*/, '').trim();
        }
      }
    } else {
      // No AI available — use static fallback
      let fallbackKey: string;
      if (type === 'social') {
        fallbackKey = platform === 'Twitter' ? 'social_twitter' : 'social_linkedin';
      } else {
        fallbackKey = type;
      }
      content = FALLBACK_CONTENT[fallbackKey] || FALLBACK_CONTENT.email;
      title = type === 'blog' ? 'How AR/VR is Transforming Indian Manufacturing in 2025' : undefined;
      usedFallback = true;
    }

    // Log the activity (best effort)
    try {
      await db.activityLog.create({
        data: {
          action: 'ai_generated',
          description: `AI generated ${type} content${platform ? ` for ${platform}` : ''}`,
          metadata: JSON.stringify({ type, platform, title, provider, fallback: usedFallback }),
        },
      });
    } catch { /* ignore */ }

    return NextResponse.json({ content, title, fallback: usedFallback, provider });
  } catch (error) {
    console.error('Error generating AI content:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}