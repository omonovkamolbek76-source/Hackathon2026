import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    return jsonOk({ tasks });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(300).optional(),
  category: z.enum(['tax', 'bank', 'hr', 'supply', 'marketing', 'planning']).optional(),
  dueDate: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle || '',
        category: parsed.data.category || 'planning',
        dueDate: parsed.data.dueDate || '',
        status: 'today',
      },
    });
    return jsonOk({ task }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
