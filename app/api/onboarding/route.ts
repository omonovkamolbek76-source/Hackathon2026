import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';
import { isTelegramConfigured } from '@/lib/telegram/client';
import {
  firstOnboardingError,
  formatOnboardingCompleteMessage,
  onboardingSaveSchema,
  onboardingTasks,
  resolveOnboardingStage,
} from '@/lib/onboarding';
import { writeAudit } from '@/lib/audit';

export async function GET() {
  try {
    const user = await requireUser();
    const [connection, profile] = await Promise.all([
      prisma.telegramConnection.findUnique({
        where: { userId: user.id },
        select: { status: true },
      }),
      prisma.businessProfile.findUnique({ where: { userId: user.id } }),
    ]);
    const telegramAvailable = isTelegramConfigured();
    return jsonOk({
      telegramAvailable,
      telegramRequired: telegramAvailable,
      telegramConnected: Boolean(connection && connection.status === 'active'),
      onboardingCompleted: Boolean(profile?.onboardingCompleted),
      path: profile?.path || '',
      tracksFinances: Boolean(profile?.tracksFinances),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = onboardingSaveSchema.safeParse(body);
    if (!parsed.success) return jsonError(firstOnboardingError(parsed.error), 400, { details: parsed.error.flatten() });

    const input = parsed.data;
    if (input.path === 'IDEA') {
      const ideaOk = z.string().trim().min(10).safeParse(input.idea);
      if (!ideaOk.success) return jsonError('G‘oyangizni kamida 10 belgi bilan yozing', 400);
      if (input.targetCustomer.trim().length < 2) return jsonError('Maqsadli mijozni yozing', 400);
      if (input.product.trim().length < 2) return jsonError('Qaysi mahsulot yoki xizmatni yozing', 400);
      if (input.marketEntry.trim().length < 8) return jsonError('Bozorga qanday chiqishingizni yozing', 400);
      if (input.location.trim().length < 2) return jsonError('Qayerda sotishingizni yozing', 400);
    } else {
      if (input.businessName.trim().length < 2) return jsonError('Biznes nomini yozing', 400);
      if (input.product.trim().length < 2) return jsonError('Nima sotilishini yozing', 400);
      if (input.location.trim().length < 2) return jsonError('Qayerda sotishingizni yozing', 400);
    }

    const [txAgg, salesCount] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId: user.id }, _count: true, _sum: { amount: true } }),
      prisma.transaction.count({ where: { userId: user.id, type: 'income' } }),
    ]);
    const stage = resolveOnboardingStage(input, salesCount, txAgg._count, txAgg._sum.amount || 0);

    const profile = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      update: {
        path: input.path,
        businessName: input.businessName,
        idea: input.idea,
        industry: input.industry,
        location: input.location,
        targetCustomer: input.targetCustomer,
        product: input.product,
        service: input.service,
        budget: input.budget,
        marketEntry: input.marketEntry,
        suppliers: JSON.stringify(input.suppliers),
        salesChannels: JSON.stringify(input.salesChannels),
        tracksFinances: input.tracksFinances,
        goals: JSON.stringify(input.goals),
        stage,
        onboardingCompleted: true,
      },
      create: {
        userId: user.id,
        path: input.path,
        businessName: input.businessName,
        idea: input.idea,
        industry: input.industry,
        location: input.location,
        targetCustomer: input.targetCustomer,
        product: input.product,
        service: input.service,
        budget: input.budget,
        marketEntry: input.marketEntry,
        suppliers: JSON.stringify(input.suppliers),
        salesChannels: JSON.stringify(input.salesChannels),
        tracksFinances: input.tracksFinances,
        goals: JSON.stringify(input.goals),
        stage,
        onboardingCompleted: true,
      },
    });

    if (input.businessName.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { businessName: input.businessName.trim(), region: input.location.trim() || undefined },
      });
    }

    const existingOpen = await prisma.task.count({ where: { userId: user.id, completed: false } });
    if (existingOpen < 8) {
      await prisma.task.createMany({
        data: onboardingTasks(input).map((t) => ({
          userId: user.id,
          title: t.title,
          subtitle: t.subtitle,
          category: t.category,
          status: 'today',
        })),
      });
    }

    await writeAudit({ userId: user.id, action: 'onboarding.completed', meta: { path: input.path } });

    return jsonOk({
      ok: true,
      path: profile.path,
      tracksFinances: profile.tracksFinances,
      telegramHint: formatOnboardingCompleteMessage({
        path: input.path,
        businessName: input.businessName,
        idea: input.idea,
        product: input.product,
        marketEntry: input.marketEntry,
        tracksFinances: input.tracksFinances,
      }),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
