import { jsonOk, jsonError } from '@/lib/api';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isProviderConfigured } from '@/lib/oauth/providers';
import { isGeminiConfigured, getGeminiModel } from '@/lib/gemini/client';
import { isTelegramConfigured } from '@/lib/telegram/client';
import { ensureTelegramSchedulerStarted } from '@/lib/telegram/scheduler';

export async function GET() {
  const started = Date.now();
  try {
    ensureTelegramSchedulerStarted();
    await prisma.$queryRaw`SELECT 1`;
    const credits = await prisma.creditProduct.count();
    const payload = {
      ok: true,
      service: 'tadbirkorai',
      time: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      latencyMs: Date.now() - started,
      database: 'up',
      creditCatalog: credits,
      geminiConfigured: isGeminiConfigured(),
      geminiModel: getGeminiModel(),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      sentryConfigured: Boolean(process.env.SENTRY_DSN),
      googleOAuthConfigured: isProviderConfigured('google'),
      microsoftOAuthConfigured: isProviderConfigured('microsoft'),
      telegramConfigured: isTelegramConfigured(),
      mfaAvailable: true,
      backupDir: process.env.BACKUP_DIR || './backups',
    };
    logger.debug('health_ok', { latencyMs: payload.latencyMs });
    return jsonOk(payload);
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    // Redact anything that looks like a connection string/credential before
    // it ever leaves the server — this diagnostic is temporary and must
    // never echo a secret back over HTTP.
    const safeMessage = rawMessage
      .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[redacted-connection-string]')
      .slice(0, 500);
    logger.error('health_db_down', { error: rawMessage });
    return jsonError('Database unavailable', 503, {
      ok: false,
      database: 'down',
      time: new Date().toISOString(),
      // TEMPORARY diagnostic field — remove once the Netlify Postgres
      // connectivity issue is root-caused.
      debugErrorName: e instanceof Error ? e.constructor.name : typeof e,
      debugErrorMessage: safeMessage,
    });
  }
}
