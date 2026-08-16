import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';
import { isProviderConfigured } from '@/lib/oauth/providers';

/** GET: which sign-in methods the current user has (for the profile screen). */
export async function GET() {
  try {
    const session = await requireUser();
    const [user, accounts] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.id }, select: { passwordHash: true } }),
      prisma.oAuthAccount.findMany({
        where: { userId: session.id },
        select: { provider: true, email: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return jsonOk({
      hasPassword: Boolean(user?.passwordHash),
      accounts,
      googleAvailable: isProviderConfigured('google'),
      microsoftAvailable: isProviderConfigured('microsoft'),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const unlinkSchema = z.object({ provider: z.enum(['google', 'microsoft']) });

/** DELETE: unlink a provider — blocked if it would leave the account with no way to sign in. */
export async function DELETE(request: Request) {
  try {
    const session = await requireUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Noto\u2018g\u2018ri JSON');
    }
    const parsed = unlinkSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400);

    const [user, accounts] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.id }, select: { passwordHash: true } }),
      prisma.oAuthAccount.findMany({ where: { userId: session.id } }),
    ]);
    const hasOtherMethod =
      Boolean(user?.passwordHash) || accounts.some((a) => a.provider !== parsed.data.provider);
    if (!hasOtherMethod) {
      return jsonError('Kamida bitta kirish usuli qolishi kerak (parol yoki boshqa provayder)', 409);
    }

    await prisma.oAuthAccount.deleteMany({ where: { userId: session.id, provider: parsed.data.provider } });
    await writeAudit({ userId: session.id, action: 'oauth.unlinked', meta: { provider: parsed.data.provider } });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
