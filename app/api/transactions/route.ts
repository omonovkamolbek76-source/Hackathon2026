import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return jsonOk({ transactions });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  amount: z.coerce.number().int().positive().max(1_000_000_000_000),
  type: z.enum(['income', 'expense']),
  category: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        amount: parsed.data.amount,
        type: parsed.data.type,
        category: parsed.data.category || 'other',
      },
    });
    return jsonOk({ transaction: tx }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
