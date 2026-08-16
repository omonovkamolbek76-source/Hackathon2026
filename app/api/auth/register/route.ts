import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  AuthError,
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { cookies } from 'next/headers';

const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  businessName: z.string().trim().max(160).optional(),
  region: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const rl = rateLimit(clientKey(request, 'register'), 5, 60_000);
  if (!rl.ok) return jsonError('Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', 429, { retryAfterSec: rl.retryAfterSec });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Noto‘g‘ri JSON');
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError('Bu email allaqachon ro‘yxatdan o‘tgan', 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name,
      phone: parsed.data.phone || '',
      businessName: parsed.data.businessName || '',
      region: parsed.data.region || '',
      tasks: {
        create: [
          {
            title: 'Profilni to‘ldirish',
            subtitle: 'Biznes nomi va hududni yangilang',
            category: 'planning',
            status: 'today',
            dueDate: 'Bugun',
          },
          {
            title: 'Birinchi kirim/chiqimni yozish',
            subtitle: 'Analitika uchun kamida 1 ta tranzaksiya',
            category: 'bank',
            status: 'upcoming',
            dueDate: '3 kun',
          },
        ],
      },
    },
  });

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  cookies().set(sessionCookieOptions(token));

  return jsonOk(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        businessName: user.businessName,
        region: user.region,
        role: user.role,
      },
    },
    { status: 201 },
  );
}
