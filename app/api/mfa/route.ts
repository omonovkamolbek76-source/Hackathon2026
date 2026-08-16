import { z } from 'zod';
import { AuthError, createSessionToken, requireUser, sessionCookieOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateMfaSecret, mfaOtpauthUrl, verifyMfaToken } from '@/lib/mfa';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';

export async function GET() {
  try {
    const session = await requireUser();
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return jsonError('Unauthorized', 401);
    return jsonOk({ enabled: user.mfaEnabled });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const rl = rateLimit(clientKey(request, `mfa-setup:${session.id}`), 5, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429, { retryAfterSec: rl.retryAfterSec });

    const secret = generateMfaSecret();
    await prisma.user.update({
      where: { id: session.id },
      data: { mfaTempSecret: secret },
    });
    const otpauth = mfaOtpauthUrl(session.email, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    await writeAudit({ userId: session.id, action: 'mfa.setup_started' });
    // The secret is returned only to the user who is currently authenticated and
    // actively enrolling their own MFA (standard TOTP UX — e.g. GitHub/Google
    // show the manual-entry secret alongside the QR code).
    return jsonOk({ otpauth, qrDataUrl, secret });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const confirmSchema = z.object({
  token: z.string().min(6).max(8),
});

export async function PUT(request: Request) {
  try {
    const session = await requireUser();
    const rl = rateLimit(clientKey(request, `mfa-verify:${session.id}`), 8, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429, { retryAfterSec: rl.retryAfterSec });

    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return jsonError('Kod noto‘g‘ri');

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.mfaTempSecret) return jsonError('Avval MFA sozlamasini boshlang', 400);

    if (!verifyMfaToken(user.mfaTempSecret, parsed.data.token)) {
      return jsonError('OTP kod noto‘g‘ri', 401);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: user.mfaTempSecret,
        mfaTempSecret: '',
        mfaEnabled: true,
        // Invalidate any session issued before MFA was enabled, closing the
        // window where a pre-MFA session could bypass the new protection.
        sessionVersion: { increment: 1 },
      },
    });
    // Re-issue a fresh cookie for this device carrying the new session version,
    // so only OTHER (e.g. stolen) sessions are logged out, not this one.
    const token = await createSessionToken({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      sessionVersion: updated.sessionVersion,
    });
    cookies().set(sessionCookieOptions(token));
    await writeAudit({ userId: user.id, action: 'mfa.enabled' });
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'MFA yoqildi',
        body: 'Hisobingiz ikki bosqichli himoya bilan himoyalandi. Boshqa qurilmalardagi sessiyalar tugatildi.',
        kind: 'security',
      },
    });
    return jsonOk({ enabled: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const disableSchema = z.object({
  token: z.string().min(6).max(8),
});

export async function DELETE(request: Request) {
  try {
    const session = await requireUser();
    const rl = rateLimit(clientKey(request, `mfa-disable:${session.id}`), 5, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429, { retryAfterSec: rl.retryAfterSec });

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return jsonError('Unauthorized', 401);

    if (user.mfaEnabled) {
      // Disabling MFA is a sensitive action: require the current TOTP code so a
      // hijacked session cookie alone cannot strip MFA protection.
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const parsed = disableSchema.safeParse(body);
      if (!parsed.success || !verifyMfaToken(user.mfaSecret, parsed.data.token)) {
        await writeAudit({ userId: user.id, action: 'mfa.disable_denied' });
        return jsonError('MFA o‘chirish uchun joriy 6 xonali kodni kiriting', 401);
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: {
        mfaEnabled: false,
        mfaSecret: '',
        mfaTempSecret: '',
        sessionVersion: { increment: 1 },
      },
    });
    const token = await createSessionToken({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      sessionVersion: updated.sessionVersion,
    });
    cookies().set(sessionCookieOptions(token));
    await writeAudit({ userId: session.id, action: 'mfa.disabled' });
    return jsonOk({ enabled: false });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
