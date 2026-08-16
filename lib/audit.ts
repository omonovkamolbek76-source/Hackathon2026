import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        meta: JSON.stringify(input.meta || {}),
        ip: input.ip || '',
      },
    });
  } catch (e) {
    logger.warn('audit_write_failed', { error: e instanceof Error ? e.message : 'unknown' });
  }
}
