import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';

const patchSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().trim().min(2).max(200).optional(),
  status: z.enum(['completed', 'today', 'overdue', 'upcoming']).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.task.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return jsonError('Topilmadi', 404);

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400);

    const completed = parsed.data.completed ?? existing.completed;
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        completed,
        status: parsed.data.status ?? (completed ? 'completed' : 'today'),
        title: parsed.data.title,
      },
    });
    return jsonOk({ task });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.task.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return jsonError('Topilmadi', 404);
    await prisma.task.delete({ where: { id: existing.id } });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
