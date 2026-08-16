import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const session = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        businessName: true,
        region: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return jsonError('Unauthorized', 401);
    return jsonOk({ user });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  businessName: z.string().trim().max(160).optional(),
  region: z.string().trim().max(80).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Noto‘g‘ri JSON');
    }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value;
    }
    if (Object.keys(data).length === 0) return jsonError('Yangilanadigan maydon topilmadi', 400);

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        businessName: true,
        region: true,
        role: true,
        createdAt: true,
      },
    });
    await writeAudit({ userId: session.id, action: 'profile.updated', meta: { fields: Object.keys(data) } });
    return jsonOk({ user });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
