import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';

const LOCAL_CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `pay-confirm:${user.id}`), 10, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p urinish', 429);

    const payment = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        OR: [{ id: params.id }, { externalId: params.id }],
      },
    });
    if (!payment) return jsonError('To‘lov topilmadi', 404);
    if (payment.provider !== 'local') {
      return jsonError('Stripe to‘lovlari webhook orqali tasdiqlanadi', 400);
    }
    if (payment.status === 'paid') return jsonOk({ payment });
    if (payment.status !== 'pending') {
      return jsonError('Bu to‘lov holati tasdiqlashga mos emas', 409);
    }
    if (Date.now() - payment.createdAt.getTime() > LOCAL_CONFIRM_WINDOW_MS) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
      return jsonError('To‘lov muddati tugagan, qaytadan boshlang', 410);
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'paid' },
    });
    await writeAudit({ userId: user.id, action: 'payment.paid_local', meta: { id: payment.id } });
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'To‘lov qabul qilindi',
        body: `Summa: ${payment.amount.toLocaleString('uz-UZ')} so‘m (local checkout).`,
        kind: 'payment',
      },
    });
    return jsonOk({ payment: updated });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
