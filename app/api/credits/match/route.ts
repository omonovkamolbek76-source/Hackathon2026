import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { matchCreditProducts } from '@/lib/credit-match';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  businessStatus: z.string().max(120).optional(),
  purpose: z.string().max(120).optional(),
  amount: z.string().max(80).optional(),
  revenue: z.string().max(80).optional(),
  debt: z.string().max(80).optional(),
  repayment: z.string().max(80).optional(),
  collateral: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `match:${user.id}`), 20, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p so‘rov', 429);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const products = await prisma.creditProduct.findMany({ where: { active: true } });
    const matched = matchCreditProducts(products, parsed.data);

    await prisma.creditApplication.create({
      data: {
        userId: user.id,
        answers: JSON.stringify(parsed.data),
        results: JSON.stringify(matched.slice(0, 10)),
      },
    });

    return jsonOk({
      products: matched,
      summary:
        'Moslik ballari algoritm bilan hisoblandi. Bu bank qarori emas. Rasmiy shartlarni tasdiqlang.',
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
