import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateBusinessPlan,
  businessPlanInputSchema,
  planToMarkdown,
  serializeSavedPlan,
  firstZodMessage,
} from '@/lib/business-plan';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const plans = await prisma.businessPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return jsonOk({
      plans: plans.map((p) => {
        const full = serializeSavedPlan(p);
        const { markdown: _markdown, ...rest } = full;
        return rest;
      }),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `plan:${user.id}`), 10, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p so‘rov', 429);

    const body = await request.json();
    const parsed = businessPlanInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(firstZodMessage(parsed.error), 400, { details: parsed.error.flatten() });
    }

    const generated = generateBusinessPlan(parsed.data);
    const saved = await prisma.businessPlan.create({
      data: {
        userId: user.id,
        businessName: generated.businessName,
        targetAudience: generated.targetAudience,
        budget: generated.budget,
        description: generated.description,
        concept: generated.concept,
        marketOpportunity: generated.marketOpportunity,
        competitors: generated.competitors,
        marketingPlan: generated.marketingPlan,
        operationalPlan: generated.operationalPlan,
        financialPlan: generated.financialPlan,
        expenses: generated.expenses,
        expectedRevenue: generated.expectedRevenue,
        breakeven: generated.breakeven,
        nextSteps: JSON.stringify(generated.nextSteps),
      },
    });

    return jsonOk(
      {
        plan: {
          ...generated,
          id: saved.id,
          nextSteps: generated.nextSteps,
        },
        markdown: planToMarkdown(generated),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
