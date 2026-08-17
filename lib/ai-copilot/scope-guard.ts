/**
 * Restricts the AI Business Copilot to business/entrepreneurship/finance/
 * platform topics and provides a lightweight heuristic pre-filter against
 * the most common off-topic requests and prompt-injection attempts.
 *
 * This is defense-in-depth, not the only line of defense: the system
 * instruction sent to Gemini (lib/coach-server.ts) also enforces scope and
 * refuses instruction-override / system-prompt-extraction. This module
 * catches the cheapest, most obvious cases BEFORE spending an API call —
 * saving quota/cost and guaranteeing a deterministic refusal even if the
 * model were ever tricked.
 */

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\brasm\s*(chiz|yarat)/i,
  /\bvideo\s*yarat/i,
  /\bmusiqa\s*(yarat|yoz)/i,
  /\bkod\s*yoz/i,
  /\bo['\u2018\u2019]yin\s*yarat/i,
  /\bshe['\u2018\u2019]r\s*yoz/i,
  /generate\s+(an?\s+)?(image|picture|photo|video|song|music|game)/i,
  /write\s+(me\s+)?(some\s+)?code/i,
  /draw\s+(me\s+)?a/i,
];

const INJECTION_PATTERNS: RegExp[] = [
  /system\s*prompt/i,
  /tizim\s*(ko['\u2018\u2019]rsatma|prompt)/i,
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /avvalgi\s+(barcha\s+)?(ko['\u2018\u2019]rsatma|qoida)(lar)?(ni|larni)?\s+(bekor|unut)/i,
  /qoidalarni\s+(bekor|unut)/i,
  /you\s+are\s+now\s+/i,
  /reveal\s+your\s+(instructions|prompt|rules|system)/i,
  /ko['\u2018\u2019]rsatmalaringni\s+(chiqar|ko['\u2018\u2019]rsat)/i,
  /\bDAN\b/,
  /jailbreak/i,
  /pretend\s+(you\s+are|to\s+be)/i,
];

export type ScopeCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'off_topic' | 'prompt_injection' };

export function checkScope(message: string): ScopeCheckResult {
  const text = message.trim();
  if (!text) return { allowed: true };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) return { allowed: false, reason: 'prompt_injection' };
  }
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) return { allowed: false, reason: 'off_topic' };
  }
  return { allowed: true };
}

export const OFF_TOPIC_REPLY =
  'Men ushbu platformadagi biznes, moliyaviy rejalashtirish va tadbirkorlik vazifalarida yordam berishga ixtisoslashganman. Boshqa mavzularda yordam bera olmayman — biznesingiz haqida nima bilishni xohlaysiz?';

export const INJECTION_REFUSAL_REPLY =
  'Men tizim ko\u2018rsatmalarimni o\u2018zgartira yoki oshkor qila olmayman. Keling, biznesingiz haqida gaplashaylik — bugun nima ustida ishlaymiz?';
