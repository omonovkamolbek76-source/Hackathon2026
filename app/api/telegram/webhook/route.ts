import { prisma } from '@/lib/db';
import { consumeLinkToken } from '@/lib/telegram/link';
import { replyToChat } from '@/lib/telegram/client';
import { ensureTelegramSchedulerStarted } from '@/lib/telegram/scheduler';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { jsonError, jsonOk } from '@/lib/api';
import { formatWelcomeMessage } from '@/lib/onboarding';

/**
 * POST /api/telegram/webhook — receives Telegram Bot updates.
 *
 * ABSOLUTE SCOPE LIMIT: this endpoint does exactly one thing — completing
 * the `/start <token>` account-linking handshake. It is NOT a conversational
 * bot: no AI, no business logic, no reading/writing platform data beyond
 * creating/updating the TelegramConnection row for the token's owner. Any
 * other message gets a fixed, static reply pointing back to the website.
 *
 * Security: verified via the secret token Telegram sends in the
 * `X-Telegram-Bot-Api-Secret-Token` header (set when registering the webhook
 * with `secret_token`) — this route is intentionally unauthenticated by
 * session cookie since Telegram cannot send one.
 */
export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = request.headers.get('x-telegram-bot-api-secret-token');
      if (provided !== expectedSecret) {
        logger.warn('telegram_webhook_invalid_secret');
        return jsonError('Unauthorized', 401);
      }
    }

    const rl = rateLimit(clientKey(request, 'telegram-webhook'), 60, 60_000);
    if (!rl.ok) return jsonOk({ ok: true }); // never error back to Telegram; just drop under load

    ensureTelegramSchedulerStarted();

    const update = (await request.json().catch(() => null)) as {
      message?: { chat?: { id?: number }; text?: string; from?: { id?: number } };
    } | null;

    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = (message?.text || '').trim();

    if (!chatId) {
      return jsonOk({ ok: true });
    }

    const startMatch = /^\/start(?:\s+(\S+))?$/.exec(text);
    if (startMatch) {
      const token = startMatch[1];
      if (!token) {
        await replyToChat(chatId, 'Ulash uchun ilovadagi "Telegramni ulash" tugmasidan foydalaning.');
        return jsonOk({ ok: true });
      }

      const result = await consumeLinkToken(token);
      if (!result.ok) {
        const reasonText =
          result.reason === 'expired'
            ? 'Havola muddati tugagan. Ilovadan qaytadan urinib ko\u2018ring.'
            : result.reason === 'already_used'
              ? 'Bu havola allaqachon ishlatilgan.'
              : 'Havola topilmadi. Ilovadan qaytadan urinib ko\u2018ring.';
        await replyToChat(chatId, `\u274C ${reasonText}`);
        return jsonOk({ ok: true });
      }

      // Re-linking the same platform user to a new chat (e.g. after switching
      // Telegram accounts) updates the existing row; a chat id already used by
      // a DIFFERENT user is rejected to avoid impersonation.
      const chatOwner = await prisma.telegramConnection.findUnique({ where: { telegramChatId: String(chatId) } });
      if (chatOwner && chatOwner.userId !== result.userId) {
        await replyToChat(chatId, '\u274C Bu Telegram hisobi boshqa foydalanuvchiga ulangan.');
        logger.warn('telegram_link_chat_conflict');
        return jsonOk({ ok: true });
      }

      await prisma.telegramConnection.upsert({
        where: { userId: result.userId },
        update: { telegramChatId: String(chatId), status: 'active' },
        create: { userId: result.userId, telegramChatId: String(chatId), status: 'active' },
      });
      await prisma.notificationSettings.upsert({
        where: { userId: result.userId },
        update: {},
        create: { userId: result.userId },
      });
      await writeAudit({ userId: result.userId, action: 'telegram.linked' });

      const owner = await prisma.user.findUnique({
        where: { id: result.userId },
        select: { name: true, businessName: true },
      });
      await replyToChat(chatId, formatWelcomeMessage(owner?.name || '', owner?.businessName || ''));
      return jsonOk({ ok: true });
    }

    // Not a linking command — this bot has no other conversational behavior.
    await replyToChat(chatId, 'Bu bot faqat bildirishnomalar uchun. Boshqarish uchun TadbirkorAI ilovasidan foydalaning.');
    return jsonOk({ ok: true });
  } catch (e) {
    logger.error('telegram_webhook_error', { message: e instanceof Error ? e.message : 'unknown' });
    // Always 200 back to Telegram so it doesn't endlessly retry a broken update.
    return jsonOk({ ok: true });
  }
}
