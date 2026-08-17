import { jsonOk, jsonError } from '@/lib/api';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isProviderConfigured } from '@/lib/oauth/providers';
import { isGeminiConfigured, getGeminiModel } from '@/lib/gemini/client';

export async function GET() {
  const started = Date.now();
  try {
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
      mfaAvailable: true,
      backupDir: process.env.BACKUP_DIR || './backups',
    };
    logger.debug('health_ok', { latencyMs: payload.latencyMs });
    return jsonOk(payload);
  } catch (e) {
    logger.error('health_db_down', { error: e instanceof Error ? e.message : 'unknown' });
    return jsonError('Database unavailable', 503, {
      ok: false,
      database: 'down',
      time: new Date().toISOString(),
    });
  }
}
