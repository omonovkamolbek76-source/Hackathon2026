import { z } from 'zod';
import { cookies } from 'next/headers';
import {
  clearOAuthMfaPendingCookieOptions,
  createSessionToken,
  readOAuthMfaPendingUserId,
  sessionCookieOptions,
} from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyMfaToken } from '@/lib/mfa';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';

const schema = z.object({ mfaCode: z.string().min(6).max(8) });

/**
 * POST /api/auth/oauth/mfa
 * Completes an OAuth login for an account that has MFA enabled. The OAuth
 * callback never issues a full session for such accounts directly — it only
 * sets a short-lived pending-MFA cookie and redirects here for the TOTP step,
 * exactly mirroring the password-login + MFA flow so OAuth can never bypass it.
 */
export async function POST(request: Request) {
  try {
    const userId = await readOAuthMfaPendingUserId();
    if (!userId) {
      return jsonError('Sessiya muddati tugagan, qaytadan urinib ko\u2018ring', 401);
    }

    const rl = rateLimit(clientKey(request, `oauth-mfa:${userId}`), 8, 60_000);
    if (!rl.ok) {
      return jsonError('Juda ko\u2018p urinish. Keyinroq qayta urinib ko\u2018ring.', 429, { retryAfterSec: rl.retryAfterSec });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Noto\u2018g\u2018ri JSON');
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError('Kod noto\u2018g\u2018ri');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled || !verifyMfaToken(user.mfaSecret, parsed.data.mfaCode)) {
      await writeAudit({ userId, action: 'auth.oauth_mfa_failed' });
      return jsonError('MFA kod noto\u2018g\u2018ri', 401);
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
    cookies().set(sessionCookieOptions(token));
    cookies().set(clearOAuthMfaPendingCookieOptions());
    await writeAudit({ userId: user.id, action: 'auth.oauth_login_ok' });

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
