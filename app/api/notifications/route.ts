import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jsonOk({ notifications });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  read: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi');
    const n = await prisma.notification.findFirst({
      where: { id: parsed.data.id, userId: user.id },
    });
    if (!n) return jsonError('Topilmadi', 404);
    const updated = await prisma.notification.update({
      where: { id: n.id },
      data: { read: parsed.data.read },
    });
    return jsonOk({ notification: updated });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
