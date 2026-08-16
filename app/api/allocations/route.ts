import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const allocations = await prisma.fundAllocation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    return jsonOk({ allocations });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const allocationItem = z.object({
  category: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  amount: z.coerce.number().int().min(0).max(10_000_000_000),
});

const putSchema = z.object({
  allocations: z.array(allocationItem).min(1).max(20),
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const saved = await prisma.$transaction(
      parsed.data.allocations.map((a) =>
        prisma.fundAllocation.upsert({
          where: { userId_category: { userId: user.id, category: a.category } },
          update: { label: a.label, amount: a.amount },
          create: { userId: user.id, category: a.category, label: a.label, amount: a.amount },
        }),
      ),
    );
    await writeAudit({ userId: user.id, action: 'allocations.saved', meta: { count: saved.length } });
    return jsonOk({ allocations: saved });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
