/**
 * Next.js instrumentation hook — called once when a new server instance
 * boots (requires `experimental.instrumentationHook` in next.config.js on
 * Next.js 13). Used ONLY to start the Telegram notification checker
 * interval; no other startup logic lives here.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureTelegramSchedulerStarted } = await import('@/lib/telegram/scheduler');
    ensureTelegramSchedulerStarted();
  }
}
