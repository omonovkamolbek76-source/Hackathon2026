import { logger } from '@/lib/logger';

/**
 * Minimal Google Gemini REST client. Deliberately dependency-free (raw
 * `fetch` to `generativelanguage.googleapis.com`) rather than an SDK — this
 * is the ONLY AI provider used anywhere in this app. Do not add any other
 * LLM provider dependency.
 *
 * Security:
 * - The API key is read from environment variables and sent only via the
 *   `x-goog-api-key` request header — never in a URL/query string (which
 *   could end up in access logs), never returned to the client, never logged.
 * - Response/error bodies are never logged verbatim (a provider error can
 *   sometimes echo request fields back).
 */

const GEMINI_HOST = 'https://generativelanguage.googleapis.com';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_TIMEOUT_MS = 20_000;

function getApiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => Boolean(k && k.trim()));
}

export function isGeminiConfigured(): boolean {
  return getApiKeys().length > 0;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

// Simple round-robin across configured keys, so a multi-key setup
// (GEMINI_API_KEY_1..3) spreads load instead of always hitting the first key.
let keyRotationIndex = 0;
function pickApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new GeminiError('GEMINI_API_KEY sozlanmagan', 501);
  }
  const key = keys[keyRotationIndex % keys.length];
  keyRotationIndex = (keyRotationIndex + 1) % keys.length;
  return key;
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export type GeminiPart = { text: string };
export type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

export type GenerateContentOptions = {
  /** System instruction — kept separate from `contents` per Gemini's API shape. */
  systemInstruction?: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
  /** When set, requests structured JSON output constrained to this schema. */
  responseSchema?: Record<string, unknown>;
  timeoutMs?: number;
};

/** Calls Gemini's `generateContent` and returns the concatenated text of the first candidate. */
export async function generateContent(opts: GenerateContentOptions): Promise<string> {
  const apiKey = pickApiKey();
  const model = getGeminiModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.4,
    maxOutputTokens: opts.maxOutputTokens ?? 800,
  };
  if (opts.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = opts.responseSchema;
  }

  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig,
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { role: 'system', parts: [{ text: opts.systemInstruction }] };
  }

  try {
    const res = await fetch(`${GEMINI_HOST}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      error?: { status?: string; message?: string };
    };

    if (!res.ok) {
      logger.error('gemini_request_failed', { status: res.status, errorStatus: data?.error?.status });
      throw new GeminiError('Gemini xizmati javob bermadi', res.status === 429 ? 429 : 502);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('');
    if (!text.trim()) {
      logger.warn('gemini_empty_response', { finishReason: data?.candidates?.[0]?.finishReason });
      throw new GeminiError('Gemini bo\u2018sh javob qaytardi', 502);
    }
    return text;
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new GeminiError('Gemini javobi kutish vaqti tugadi', 504);
    }
    logger.error('gemini_network_error', { message: e instanceof Error ? e.message : 'unknown' });
    throw new GeminiError('Gemini bilan bog\u2018lanib bo\u2018lmadi', 502);
  } finally {
    clearTimeout(timeout);
  }
}
