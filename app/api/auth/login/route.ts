import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSessionToken, sessionCookieOptions, verifyPassword } from '@/lib/auth';
import { verifyMfaToken } from '@/lib/mfa';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  mfaCode: z.string().min(6).max(8).optional(),
});

export async function POST(request: Request) {
  const rl = rateLimit(clientKey(request, 'login'), 10, 60_000);
  if (!rl.ok) return jsonError('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429, { retryAfterSec: rl.retryAfterSec });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Noto‘g‘ri JSON');
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError('Email yoki parol noto‘g‘ri', 400);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await writeAudit({ action: 'auth.login_failed', meta: { email: parsed.data.email.toLowerCase() } });
    return jsonError('Email yoki parol noto‘g‘ri', 401);
  }

  if (user.mfaEnabled) {
    if (!parsed.data.mfaCode) {
      return jsonError('MFA kodi talab qilinadi', 401, { mfaRequired: true });
    }
    if (!verifyMfaToken(user.mfaSecret, parsed.data.mfaCode)) {
      await writeAudit({ userId: user.id, action: 'auth.mfa_failed' });
      return jsonError('MFA kod noto‘g‘ri', 401, { mfaRequired: true });
    }
  }

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  cookies().set(sessionCookieOptions(token));
  await writeAudit({ userId: user.id, action: 'auth.login_ok' });

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      businessName: user.businessName,
      region: user.region,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
    },
  });
}
