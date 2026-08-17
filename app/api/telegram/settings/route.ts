import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  telegramEnabled: z.boolean().optional(),
  taskNotifications: z.boolean().optional(),
  financialNotifications: z.boolean().optional(),
  businessNotifications: z.boolean().optional(),
  subscriptionNotifications: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Noto\u2018g\u2018ri JSON');
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });
    if (Object.keys(parsed.data).length === 0) return jsonError('Hech qanday sozlama yuborilmadi', 400);

    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: { userId: user.id, ...parsed.data },
    });
    await writeAudit({ userId: user.id, action: 'notification_settings.updated' });
    return jsonOk({ settings });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
