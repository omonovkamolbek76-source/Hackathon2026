import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getBotUsername, isTelegramConfigured } from '@/lib/telegram/client';

const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes — short-lived per spec section 19

/**
 * Generates a unique, short-lived, single-use token and the Telegram deep
 * link the user opens to complete linking (`https://t.me/<bot>?start=<token>`).
 * This is the ONLY way a Telegram chat can ever become associated with a
 * platform user — the token proves the request originated from an
 * authenticated session, and the webhook only trusts a token it can look up
 * and that hasn't been used or expired (see consumeLinkToken).
 */
export async function createTelegramLinkToken(userId: string): Promise<{ token: string; deepLink: string | null }> {
  const token = randomBytes(24).toString('base64url');
  await prisma.telegramLinkToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
    },
  });

  const botUsername = getBotUsername();
  const deepLink = botUsername ? `https://t.me/${botUsername}?start=${token}` : null;
  return { token, deepLink };
}

export type ConsumeLinkResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' };

/**
 * Validates and single-use-consumes a link token from an incoming Telegram
 * `/start <token>` message. Never allows the same token to be used twice,
 * and rejects unknown or expired tokens outright.
 */
export async function consumeLinkToken(token: string): Promise<ConsumeLinkResult> {
  const record = await prisma.telegramLinkToken.findUnique({ where: { token } });
  if (!record) return { ok: false, reason: 'not_found' };
  if (record.usedAt) return { ok: false, reason: 'already_used' };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  await prisma.telegramLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, userId: record.userId };
}

export { isTelegramConfigured };
