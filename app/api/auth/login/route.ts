import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSessionToken, sessionCookieOptions, verifyPassword } from '@/lib/auth';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
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

  // Constant-ish message to reduce enumeration
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return jsonError('Email yoki parol noto‘g‘ri', 401);
  }

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  cookies().set(sessionCookieOptions(token));

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      businessName: user.businessName,
      region: user.region,
      role: user.role,
    },
  });
}
