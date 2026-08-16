import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { createPaymentSession } from '@/lib/payments';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await requireUser();
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return jsonOk({
      payments,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const schema = z.object({
  amount: z.coerce.number().int().positive().max(100_000_000),
  purpose: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `pay:${user.id}`), 10, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p so‘rov', 429);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const payment = await createPaymentSession({
      userId: user.id,
      amount: parsed.data.amount,
      purpose: parsed.data.purpose,
    });
    await writeAudit({
      userId: user.id,
      action: 'payment.created',
      meta: { id: payment.id, provider: payment.provider, amount: payment.amount },
    });
    return jsonOk({ payment }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    // Never leak internal/provider error details (e.g. raw Stripe API errors) to the client.
    logger.error('payment_create_failed', { message: e instanceof Error ? e.message : 'unknown' });
    return jsonError('To‘lov yaratib bo‘lmadi. Keyinroq qayta urinib ko‘ring.', 500);
  }
}
