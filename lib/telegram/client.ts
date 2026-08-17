import { logger } from '@/lib/logger';

/**
 * Minimal Telegram Bot API client. Dependency-free (raw fetch), consistent
 * with lib/gemini/client.ts and lib/oauth/*. This module ONLY sends messages
 * and classifies delivery errors — it has no notification-content logic of
 * its own (that lives in lib/telegram/events.ts + checker.ts).
 */

const TELEGRAM_API_HOST = 'https://api.telegram.org';

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new TelegramError('TELEGRAM_BOT_TOKEN sozlanmagan', 'not_configured');
  return token;
}

export function getBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

export type TelegramErrorKind = 'not_configured' | 'blocked' | 'chat_not_found' | 'rate_limited' | 'network' | 'unknown';

export class TelegramError extends Error {
  kind: TelegramErrorKind;
  constructor(message: string, kind: TelegramErrorKind) {
    super(message);
    this.kind = kind;
  }
}

function classifyTelegramApiError(description: string | undefined): TelegramErrorKind {
  const d = (description || '').toLowerCase();
  if (d.includes('blocked by the user') || d.includes('user is deactivated') || d.includes('bot was kicked')) {
    return 'blocked';
  }
  if (d.includes('chat not found') || d.includes('user not found')) {
    return 'chat_not_found';
  }
  if (d.includes('too many requests')) {
    return 'rate_limited';
  }
  return 'unknown';
}

/**
 * Sends a plain-text message to a Telegram chat. Never includes anything
 * beyond the message text the caller provides — no markup fetched from
 * elsewhere, no external content.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API_HOST}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });

  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; error_code?: number };
  if (!res.ok || !data.ok) {
    const kind = classifyTelegramApiError(data.description);
    // Never log the bot token or full response body (could theoretically echo request content).
    logger.warn('telegram_send_failed', { status: res.status, errorCode: data.error_code, kind });
    throw new TelegramError(data.description || 'Telegram xabar yuborilmadi', kind);
  }
}

/** Replies to a webhook update (used only for the /start linking handshake — no other bot logic). */
export async function replyToChat(chatId: number | string, text: string): Promise<void> {
  try {
    await sendTelegramMessage(String(chatId), text);
  } catch (e) {
    logger.warn('telegram_reply_failed', { message: e instanceof Error ? e.message : 'unknown' });
  }
}
