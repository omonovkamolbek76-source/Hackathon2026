import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serializeSavedPlan } from '@/lib/business-plan';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const plan = await prisma.businessPlan.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!plan) return jsonError('Reja topilmadi', 404);
    const serialized = serializeSavedPlan(plan);
    return jsonOk({ plan: serialized, markdown: serialized.markdown });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
