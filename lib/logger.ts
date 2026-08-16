type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): Level {
  const v = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (v === 'debug' || v === 'warn' || v === 'error') return v;
  return 'info';
}

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[currentLevel()]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    service: 'tadbirkorai',
    ...(meta || {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};

/** Optional Sentry capture — only if SENTRY_DSN set (no-op otherwise). */
export async function captureException(err: unknown, meta?: Record<string, unknown>) {
  const dsn = process.env.SENTRY_DSN;
  logger.error(err instanceof Error ? err.message : 'unknown_error', {
    ...meta,
    stack: err instanceof Error ? err.stack : undefined,
    sentryConfigured: Boolean(dsn),
  });
  // Lightweight ingest without SDK dependency when DSN present
  if (!dsn) return;
  try {
    // Store as audit-friendly log only; full Sentry SDK can be added later
    logger.warn('sentry_dsn_present_use_external_agent_or_sdk', { dsnHost: new URL(dsn).host });
  } catch {
    /* ignore */
  }
}
