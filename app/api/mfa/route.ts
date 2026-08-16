import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateMfaSecret, mfaOtpauthUrl, verifyMfaToken } from '@/lib/mfa';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';
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

export async function POST() {
  try {
    const session = await requireUser();
    const secret = generateMfaSecret();
    await prisma.user.update({
      where: { id: session.id },
      data: { mfaTempSecret: secret },
    });
    const otpauth = mfaOtpauthUrl(session.email, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    await writeAudit({ userId: session.id, action: 'mfa.setup_started' });
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
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return jsonError('Kod noto‘g‘ri');

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.mfaTempSecret) return jsonError('Avval MFA sozlamasini boshlang', 400);

    if (!verifyMfaToken(user.mfaTempSecret, parsed.data.token)) {
      return jsonError('OTP kod noto‘g‘ri', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: user.mfaTempSecret,
        mfaTempSecret: '',
        mfaEnabled: true,
      },
    });
    await writeAudit({ userId: user.id, action: 'mfa.enabled' });
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'MFA yoqildi',
        body: 'Hisobingiz ikki bosqichli himoya bilan himoyalandi.',
        kind: 'security',
      },
    });
    return jsonOk({ enabled: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

export async function DELETE() {
  try {
    const session = await requireUser();
    await prisma.user.update({
      where: { id: session.id },
      data: { mfaEnabled: false, mfaSecret: '', mfaTempSecret: '' },
    });
    await writeAudit({ userId: session.id, action: 'mfa.disabled' });
    return jsonOk({ enabled: false });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
