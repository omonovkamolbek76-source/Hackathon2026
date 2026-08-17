import { runNotificationCheckerTick } from '@/lib/telegram/checker';
import { jsonError, jsonOk } from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * POST /api/telegram/check — runs one notification-checker pass on demand.
 *
 * This exists for deployment targets where the in-process interval
 * (instrumentation.ts + lib/telegram/scheduler.ts) isn't viable — e.g. a
 * serverless target with no long-lived process — so an external scheduler
 * (Vercel Cron, Netlify Scheduled Functions, a plain cron job, etc.) can
 * drive the exact same checker on a 20-30s-or-longer cadence instead.
 *
 * Protected by a shared secret (infrastructure-to-infrastructure call, not a
 * logged-in user), never by session cookie.
 */
export async function POST(request: Request) {
  const configuredSecret = process.env.TELEGRAM_CRON_SECRET;
  if (!configuredSecret) {
    return jsonError('TELEGRAM_CRON_SECRET sozlanmagan', 501);
  }
  const provided = request.headers.get('x-cron-secret');
  if (provided !== configuredSecret) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const result = await runNotificationCheckerTick();
    return jsonOk(result);
  } catch (e) {
    logger.error('telegram_manual_check_failed', { message: e instanceof Error ? e.message : 'unknown' });
    return jsonError('Server xatosi', 500);
  }
}
