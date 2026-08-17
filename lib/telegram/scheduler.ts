import { runNotificationCheckerTick } from '@/lib/telegram/checker';
import { isTelegramConfigured } from '@/lib/telegram/client';
import { logger } from '@/lib/logger';

/**
 * In-process scheduler for the Telegram notification checker — the simplest
 * fit for this single-Node-process app (section 26: "oddiy scheduler
 * yetarli bo'lsa ... yetarli", no new queue/worker infrastructure).
 *
 * Started from instrumentation.ts's register() hook (primary path) and,
 * defensively, from the Telegram API routes on first use (in case a given
 * deployment target doesn't invoke the Next.js instrumentation hook) — both
 * calls are idempotent via the global guard below, matching the existing
 * Prisma-singleton pattern in lib/db.ts.
 */

const globalForScheduler = globalThis as unknown as { __telegramSchedulerStarted?: boolean };

const DEFAULT_INTERVAL_SECONDS = 25;
const MIN_INTERVAL_SECONDS = 5; // guard against a misconfigured, too-aggressive interval

function getIntervalMs(): number {
  const raw = process.env.NOTIFICATION_INTERVAL_SECONDS;
  const parsed = raw ? Number(raw) : DEFAULT_INTERVAL_SECONDS;
  const seconds = Number.isFinite(parsed) && parsed >= MIN_INTERVAL_SECONDS ? parsed : DEFAULT_INTERVAL_SECONDS;
  return seconds * 1000;
}

let tickInFlight = false;

async function tick() {
  if (tickInFlight) return; // never overlap ticks if one is still running
  tickInFlight = true;
  try {
    await runNotificationCheckerTick();
  } catch (e) {
    logger.error('telegram_scheduler_tick_error', { message: e instanceof Error ? e.message : 'unknown' });
  } finally {
    tickInFlight = false;
  }
}

export function ensureTelegramSchedulerStarted(): void {
  if (globalForScheduler.__telegramSchedulerStarted) return;
  if (!isTelegramConfigured()) return; // no bot token configured -> feature is fully inert, nothing to schedule

  globalForScheduler.__telegramSchedulerStarted = true;
  const intervalMs = getIntervalMs();
  logger.info('telegram_scheduler_started', { intervalMs });
  setInterval(() => {
    void tick();
  }, intervalMs);
}
