import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function freshClient() {
  vi.resetModules();
  return import('@/lib/gemini/client');
}

describe('Gemini client — configuration', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('reports not configured when no API key env vars are set', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY_1;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.GEMINI_API_KEY_3;
    const { isGeminiConfigured } = await freshClient();
    expect(isGeminiConfigured()).toBe(false);
  });

  it('reports configured when GEMINI_API_KEY is set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { isGeminiConfigured } = await freshClient();
    expect(isGeminiConfigured()).toBe(true);
  });

  it('reports configured when only a numbered key (GEMINI_API_KEY_1) is set', async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY_1 = 'test-key-1';
    const { isGeminiConfigured } = await freshClient();
    expect(isGeminiConfigured()).toBe(true);
  });

  it('defaults the model when GEMINI_MODEL is unset, and honors it when set', async () => {
    delete process.env.GEMINI_MODEL;
    const mod1 = await freshClient();
    expect(mod1.getGeminiModel()).toBe('gemini-2.0-flash');

    process.env.GEMINI_MODEL = 'gemini-3.5-flash';
    const mod2 = await freshClient();
    expect(mod2.getGeminiModel()).toBe('gemini-3.5-flash');
  });
});

describe('Gemini client — generateContent (network mocked)', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it('sends the API key only via header, never in the URL', async () => {
    const { generateContent } = await freshClient();
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        capturedUrl = String(url);
        capturedHeaders = (init.headers as Record<string, string>) || {};
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Salom!' }] } }] }),
          { status: 200 },
        );
      }),
    );

    const text = await generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
    expect(text).toBe('Salom!');
    expect(capturedUrl).not.toContain('test-key');
    expect(capturedHeaders['x-goog-api-key']).toBe('test-key');
  });

  it('throws a GeminiError (not a raw network error) when the API responds with an error status', async () => {
    const { generateContent, GeminiError } = await freshClient();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { status: 'PERMISSION_DENIED' } }), { status: 403 })),
    );

    await expect(generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] })).rejects.toThrow(GeminiError);
  });

  it('throws when the response has no usable text (e.g. safety block)', async () => {
    const { generateContent } = await freshClient();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }), { status: 200 })),
    );

    await expect(generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] })).rejects.toThrow();
  });

  it('requests structured JSON output when a responseSchema is provided', async () => {
    const { generateContent } = await freshClient();
    let capturedBody: Record<string, unknown> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 });
      }),
    );

    await generateContent({
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      responseSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    });

    const genConfig = capturedBody.generationConfig as Record<string, unknown>;
    expect(genConfig.responseMimeType).toBe('application/json');
    expect(genConfig.responseSchema).toBeDefined();
  });

  it('throws immediately (before any network call) when no key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const { generateContent } = await freshClient();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] })).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
