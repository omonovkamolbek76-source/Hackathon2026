import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isTelegramConfigured } from '@/lib/telegram/client';
import { ensureTelegramSchedulerStarted } from '@/lib/telegram/scheduler';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    ensureTelegramSchedulerStarted();
    const [connection, settings] = await Promise.all([
      prisma.telegramConnection.findUnique({
        where: { userId: user.id },
        select: { status: true, connectedAt: true },
      }),
      prisma.notificationSettings.findUnique({ where: { userId: user.id } }),
    ]);

    return jsonOk({
      available: isTelegramConfigured(),
      connected: Boolean(connection && connection.status === 'active'),
      status: connection?.status || null,
      connectedAt: connection?.connectedAt || null,
      settings: {
        telegramEnabled: settings?.telegramEnabled ?? true,
        taskNotifications: settings?.taskNotifications ?? true,
        financialNotifications: settings?.financialNotifications ?? true,
        businessNotifications: settings?.businessNotifications ?? true,
        subscriptionNotifications: settings?.subscriptionNotifications ?? true,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
