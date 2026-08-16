import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

/** User data export (ownership-scoped). */
export async function GET() {
  try {
    const user = await requireUser();
    const [profile, tasks, transactions, plans, payments, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          businessName: true,
          region: true,
          role: true,
          mfaEnabled: true,
          createdAt: true,
        },
      }),
      prisma.task.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({ where: { userId: user.id } }),
      prisma.businessPlan.findMany({ where: { userId: user.id } }),
      prisma.payment.findMany({ where: { userId: user.id } }),
      prisma.notification.findMany({ where: { userId: user.id } }),
    ]);
    await writeAudit({ userId: user.id, action: 'export.data' });
    return jsonOk({
      exportedAt: new Date().toISOString(),
      profile,
      tasks,
      transactions,
      plans,
      payments,
      notifications,
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
