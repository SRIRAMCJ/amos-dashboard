/**
 * AI Provider Abstraction Layer
 *
 * Uses free, open-source models via API when HF_TOKEN is set.
 * Primary: Groq (Llama 3.1 8B) — lightning fast, no cold start, free tier.
 * Fallback: HuggingFace (Mistral 7B) — may have cold start delays.
 *
 * Get your free token: https://console.groq.com/keys (recommended, fastest)
 * Alternative: https://huggingface.co/settings/tokens (free, may have cold starts)
 * No credit card required for either.
 */

export type AIProvider = 'ollama' | 'groq' | 'huggingface' | 'none';

let _cachedProvider: AIProvider | null = null;

// ── Detect the AI provider ────────────────────────────────────────────────

export async function getAIProvider(): Promise<{ provider: AIProvider }> {
  if (_cachedProvider !== null) {
    return { provider: _cachedProvider };
  }

  // Highest priority: Ollama (local, free, private) — skip check on Vercel/production
  if (process.env.OLLAMA_BASE_URL || (process.env.NODE_ENV !== 'production' && (await isOllamaRunning()))) {
    _cachedProvider = 'ollama';
    console.log('[AI Provider] Using Ollama (local inference — free, private, no API key needed)');
    return { provider: 'ollama' };
  }

  // Prefer Groq (faster, no cold start)
  if (process.env.GROQ_API_KEY) {
    _cachedProvider = 'groq';
    console.log('[AI Provider] Using Groq API (Llama-3.1-8B — free, open-source, instant)');
    return { provider: 'groq' };
  }

  // Fallback to HuggingFace
  if (process.env.HF_TOKEN) {
    _cachedProvider = 'huggingface';
    console.log('[AI Provider] Using HuggingFace Inference API (Mistral-7B — free, open-source)');
    return { provider: 'huggingface' };
  }

  _cachedProvider = 'none';
  console.warn('[AI Provider] No AI provider available. Set OLLAMA_BASE_URL (local), GROQ_API_KEY (recommended) or HF_TOKEN env var.');
  return { provider: 'none' };
}

// ── Chat Completion ─────────────────────────────────────────────────────────

interface ChatMsg {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function chatCompletion(
  messages: ChatMsg[],
  options?: { maxTokens?: number }
): Promise<{ content: string; provider: AIProvider }> {
  const { provider } = await getAIProvider();

  if (provider === 'ollama') return ollamaChat(messages, options?.maxTokens);
  if (provider === 'groq') {
    return groqChat(messages, options?.maxTokens);
  }
  if (provider === 'huggingface') {
    return huggingfaceChat(messages, options?.maxTokens);
  }

  throw new Error('NO_AI_PROVIDER');
}

// ── Ollama Implementation (local inference, highest priority) ───────────────

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';
const OLLAMA_API_URL = `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`;

async function isOllamaRunning(): Promise<boolean> {
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ollamaChat(
  messages: ChatMsg[],
  maxTokens?: number
): Promise<{ content: string; provider: AIProvider }> {
  const res = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: { num_predict: maxTokens || 4096, temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(120000), // 2 min timeout for local inference
  });

  if (!res.ok) {
    throw new Error(`Ollama error (${res.status})`);
  }

  const data = await res.json();
  const content = data?.message?.content || 'No response generated.';

  return { content, provider: 'ollama' };
}

// ── Groq Implementation (Llama 3.1 8B — FAST, no cold start) ──────────────

const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function groqChat(
  messages: ChatMsg[],
  maxTokens?: number
): Promise<{ content: string; provider: AIProvider }> {
  const apiKey = process.env.GROQ_API_KEY!;

  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens || 2048,
        temperature: 0.7,
      }),
    });
  } catch (error) {
    throw new Error(`Groq connection failed: ${error instanceof Error ? error.message : 'Network error'}`);
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = (errorData as Record<string, unknown>)?.error
      ? ((errorData as Record<string, Record<string, string>>).error?.message || JSON.stringify(errorData))
      : JSON.stringify(errorData);
    throw new Error(`Groq API error (${res.status}): ${msg}`);
  }

  const data = await res.json();
  const content =
    data?.choices?.[0]?.message?.content || 'No response generated.';

  return { content, provider: 'groq' };
}

// ── HuggingFace Implementation (native inference API) ───────────────────────

const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

function buildMistralPrompt(messages: ChatMsg[]): string {
  let systemPrompt = '';
  const conversation: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else if (msg.role === 'user') {
      conversation.push(`[INST] ${msg.content}[/INST]`);
    } else if (msg.role === 'assistant') {
      conversation.push(msg.content);
    }
  }

  if (systemPrompt) {
    const firstUser = conversation.shift() || '';
    return `<s>[INST] ${systemPrompt}\n\n${firstUser}[/INST]` +
      (conversation.length > 0 ? '\n' + conversation.join('\n') : '');
  }

  return `<s>${conversation.join('\n')}`;
}

async function huggingfaceChat(
  messages: ChatMsg[],
  maxTokens?: number
): Promise<{ content: string; provider: AIProvider }> {
  const token = process.env.HF_TOKEN!;
  const prompt = buildMistralPrompt(messages);

  const body: Record<string, unknown> = {
    inputs: prompt,
    parameters: {
      max_new_tokens: maxTokens || 2048,
      temperature: 0.7,
      return_full_text: false,
      do_sample: true,
    },
  };

  // Use wait_for_model query param to handle cold starts
  const res = await fetch(`${HF_API_URL}?wait_for_model=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`HuggingFace API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  let content = '';

  if (Array.isArray(data) && data.length > 0) {
    content = (data[0] as Record<string, unknown>)?.generated_text?.toString() || '';
  }

  return { content: content.trim() || 'No response generated.', provider: 'huggingface' };
}