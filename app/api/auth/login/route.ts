import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSessionToken, sessionCookieOptions, verifyPasswordConstantTime } from '@/lib/auth';
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
  try {
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

    // Always run bcrypt (real or dummy hash) so a non-existent email and a wrong
    // password take the same amount of time, mitigating account enumeration.
    const passwordOk = await verifyPasswordConstantTime(parsed.data.password, user?.passwordHash);
    if (!user || !passwordOk) {
      await writeAudit({ action: 'auth.login_failed', meta: { email: parsed.data.email.toLowerCase() } });
      return jsonError('Email yoki parol noto‘g‘ri', 401);
    }

    if (user.mfaEnabled) {
      // Separate, tighter limit on MFA verification to slow down TOTP brute-force
      // (6-digit code within a 30s window is guessable without this).
      const mfaRl = rateLimit(clientKey(request, `mfa-verify:${user.id}`), 8, 60_000);
      if (!mfaRl.ok) {
        return jsonError('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429, { retryAfterSec: mfaRl.retryAfterSec, mfaRequired: true });
      }
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
      sessionVersion: user.sessionVersion,
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
  } catch {
    return jsonError('Server xatosi', 500);
  }
}
