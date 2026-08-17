import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

/** DELETE /api/telegram/connection — unlinks Telegram; no further notifications are sent. */
export async function DELETE() {
  try {
    const user = await requireUser();
    const existing = await prisma.telegramConnection.findUnique({ where: { userId: user.id } });
    if (!existing) return jsonError('Telegram ulanmagan', 404);

    await prisma.telegramConnection.delete({ where: { userId: user.id } });
    await writeAudit({ userId: user.id, action: 'telegram.unlinked' });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
