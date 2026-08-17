import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createTelegramLinkToken } from '@/lib/telegram/link';
import { isTelegramConfigured, getBotUsername } from '@/lib/telegram/client';
import { ensureTelegramSchedulerStarted } from '@/lib/telegram/scheduler';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

/**
 * POST /api/telegram/link — starts the secure Telegram linking handshake.
 * Returns a one-time deep link (`https://t.me/<bot>?start=<token>`); opening
 * it in Telegram sends `/start <token>` to the bot, which the webhook
 * exchanges for a TelegramConnection (see app/api/telegram/webhook/route.ts).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    if (!isTelegramConfigured()) {
      return jsonError('Telegram bildirishnomalari hozircha sozlanmagan', 501);
    }

    const rl = rateLimit(clientKey(request, `telegram-link:${user.id}`), 5, 60_000);
    if (!rl.ok) return jsonError('Juda ko\u2018p urinish. Keyinroq qayta urinib ko\u2018ring.', 429, { retryAfterSec: rl.retryAfterSec });

    const existing = await prisma.telegramConnection.findUnique({ where: { userId: user.id } });
    if (existing && existing.status === 'active') {
      return jsonError('Telegram allaqachon ulangan', 409);
    }

    ensureTelegramSchedulerStarted();

    const { token, deepLink } = await createTelegramLinkToken(user.id);
    await writeAudit({ userId: user.id, action: 'telegram.link_requested' });

    return jsonOk({
      token,
      deepLink,
      botUsername: getBotUsername(),
      expiresInSec: 600,
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
