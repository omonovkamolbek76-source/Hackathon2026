import { prisma } from '@/lib/db';
import { sendTelegramMessage, TelegramError } from '@/lib/telegram/client';
import {
  getApplicationUpdateCandidates,
  getBusinessUpdateCandidates,
  getDeadlineReminderCandidates,
  getFinancialUpdateCandidates,
  getPaymentsDueCandidates,
  getSubscriptionUpdateCandidates,
  getSwotDigestCandidates,
  getTopicDigestCandidates,
  getSystemNotificationCandidates,
  getTaskReminderCandidates,
  getXReportCandidates,
  getZReportCandidates,
  type NotificationCandidate,
} from '@/lib/telegram/events';
import { logger } from '@/lib/logger';

/** No infinite retry (section 15): after this many failed send attempts, a
 * given event is permanently skipped (it stays visible in the table with
 * status "failed", it is simply never retried further). */
const MAX_SEND_ATTEMPTS = 3;

type EnabledCategories = {
  taskNotifications: boolean;
  financialNotifications: boolean;
  businessNotifications: boolean;
  subscriptionNotifications: boolean;
};

async function collectCandidatesForUser(userId: string, enabled: EnabledCategories): Promise<NotificationCandidate[]> {
  const groups = await Promise.all([
    enabled.taskNotifications ? getTaskReminderCandidates(userId) : Promise.resolve([]),
    enabled.taskNotifications ? getDeadlineReminderCandidates(userId) : Promise.resolve([]),
    enabled.taskNotifications ? getPaymentsDueCandidates(userId) : Promise.resolve([]),
    enabled.financialNotifications ? getFinancialUpdateCandidates(userId) : Promise.resolve([]),
    enabled.financialNotifications ? getXReportCandidates(userId) : Promise.resolve([]),
    enabled.financialNotifications ? getZReportCandidates(userId) : Promise.resolve([]),
    enabled.businessNotifications ? getBusinessUpdateCandidates(userId) : Promise.resolve([]),
    enabled.businessNotifications ? getSwotDigestCandidates(userId) : Promise.resolve([]),
    enabled.businessNotifications ? getTopicDigestCandidates(userId) : Promise.resolve([]),
    enabled.businessNotifications ? getApplicationUpdateCandidates(userId) : Promise.resolve([]),
    enabled.subscriptionNotifications ? getSubscriptionUpdateCandidates(userId) : Promise.resolve([]),
    // Security/payment relays are not gated by a per-category toggle (only
    // the master `telegramEnabled` switch, checked by the caller).
    getSystemNotificationCandidates(userId),
  ]);
  return groups.flat();
}

function formatMessage(candidate: NotificationCandidate): string {
  return `${candidate.title}\n\n${candidate.message}`;
}

/**
 * "Claims" a candidate event, keyed by the unique (userId, type, eventId)
 * constraint. The common case — this event was already seen on a previous
 * tick — is a cheap read with no thrown exception. The DB unique constraint
 * is still the real safety net: if two processes race past the initial read
 * at the same time (multi-instance deployment, section 30), only one
 * `create` succeeds and the loser falls back to reading the winner's row
 * instead of ever sending a duplicate.
 */
async function claimOrGetExisting(userId: string, telegramChatId: string, candidate: NotificationCandidate) {
  const where = { userId_type_eventId: { userId, type: candidate.type, eventId: candidate.eventId } } as const;

  const existing = await prisma.telegramNotification.findUnique({ where });
  if (existing) return existing;

  try {
    return await prisma.telegramNotification.create({
      data: {
        userId,
        telegramChatId,
        type: candidate.type,
        eventId: candidate.eventId,
        title: candidate.title,
        message: candidate.message,
        status: 'pending',
      },
    });
  } catch {
    // Lost a race against a concurrent claim — read back whichever row won.
    const raceWinner = await prisma.telegramNotification.findUnique({ where });
    if (raceWinner) return raceWinner;
    throw new Error('telegram_notification_claim_failed');
  }
}

export async function processUserNotifications(
  userId: string,
  telegramChatId: string,
): Promise<{ sent: number; skipped: number; failed: number }> {
  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });

  // Master switch — disabled means no Telegram traffic for this user at all,
  // and we skip every downstream query entirely (no wasted work).
  if (settings && !settings.telegramEnabled) {
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const enabled: EnabledCategories = {
    taskNotifications: settings?.taskNotifications ?? true,
    financialNotifications: settings?.financialNotifications ?? true,
    businessNotifications: settings?.businessNotifications ?? true,
    subscriptionNotifications: settings?.subscriptionNotifications ?? true,
  };

  const candidates = await collectCandidatesForUser(userId, enabled);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const record = await claimOrGetExisting(userId, telegramChatId, candidate);

    if (record.status === 'sent' || record.status === 'blocked') {
      skipped++;
      continue;
    }
    if (record.attempts >= MAX_SEND_ATTEMPTS) {
      skipped++;
      continue;
    }

    try {
      await sendTelegramMessage(telegramChatId, formatMessage(candidate));
      await prisma.telegramNotification.update({
        where: { id: record.id },
        data: { status: 'sent', sentAt: new Date(), attempts: { increment: 1 } },
      });
      sent++;
    } catch (e) {
      const blocked = e instanceof TelegramError && (e.kind === 'blocked' || e.kind === 'chat_not_found');
      await prisma.telegramNotification.update({
        where: { id: record.id },
        data: { status: blocked ? 'blocked' : 'failed', attempts: { increment: 1 } },
      });
      if (blocked) {
        await prisma.telegramConnection
          .update({ where: { userId }, data: { status: 'blocked' } })
          .catch(() => undefined);
      }
      failed++;
    }
  }

  return { sent, skipped, failed };
}

/**
 * One full checker pass: for every ACTIVE Telegram connection, compute and
 * send any new notifications. Users without a connection, or whose
 * connection is blocked/unlinked, are never queried (section 9/29).
 */
export async function runNotificationCheckerTick(): Promise<{ usersChecked: number; sent: number; failed: number }> {
  const connections = await prisma.telegramConnection.findMany({
    where: { status: 'active' },
    select: { userId: true, telegramChatId: true },
  });

  let sent = 0;
  let failed = 0;
  for (const conn of connections) {
    try {
      const result = await processUserNotifications(conn.userId, conn.telegramChatId);
      sent += result.sent;
      failed += result.failed;
    } catch (e) {
      logger.error('telegram_checker_user_failed', { message: e instanceof Error ? e.message : 'unknown' });
    }
  }

  // Deliberately quiet when there's nothing to report (section 14 — no
  // "nothing happened" noise in the logs).
  if (sent > 0 || failed > 0) {
    logger.info('telegram_checker_tick', { usersChecked: connections.length, sent, failed });
  }

  return { usersChecked: connections.length, sent, failed };
}
