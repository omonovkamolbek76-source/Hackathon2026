import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { detectBusinessStage } from '@/lib/ai-copilot/business-stage';
import { writeAudit } from '@/lib/audit';
import { jsonError, jsonOk } from '@/lib/api';

function parseJsonArray(raw: string | null | undefined): string[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function serializeProfile(profile: {
  businessName: string;
  idea: string;
  industry: string;
  location: string;
  targetCustomer: string;
  product: string;
  service: string;
  budget: number;
  suppliers: string;
  salesChannels: string;
  marketingChannels: string;
  stage: string;
  goals: string;
  challenges: string;
  path: string;
  marketEntry: string;
  tracksFinances: boolean;
  onboardingCompleted: boolean;
}) {
  return {
    businessName: profile.businessName,
    idea: profile.idea,
    industry: profile.industry,
    location: profile.location,
    targetCustomer: profile.targetCustomer,
    product: profile.product,
    service: profile.service,
    budget: profile.budget,
    suppliers: parseJsonArray(profile.suppliers),
    salesChannels: parseJsonArray(profile.salesChannels),
    marketingChannels: parseJsonArray(profile.marketingChannels),
    stage: profile.stage,
    goals: parseJsonArray(profile.goals),
    challenges: parseJsonArray(profile.challenges),
    path: profile.path,
    marketEntry: profile.marketEntry,
    tracksFinances: profile.tracksFinances,
    onboardingCompleted: profile.onboardingCompleted,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
    return jsonOk({ profile: profile ? serializeProfile(profile) : null });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const putSchema = z.object({
  businessName: z.string().trim().max(160).optional(),
  idea: z.string().trim().max(2000).optional(),
  industry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  targetCustomer: z.string().trim().max(500).optional(),
  product: z.string().trim().max(500).optional(),
  service: z.string().trim().max(500).optional(),
  budget: z.coerce.number().int().min(0).max(100_000_000_000).optional(),
  suppliers: z.array(z.string().trim().max(120)).max(20).optional(),
  salesChannels: z.array(z.string().trim().max(60)).max(20).optional(),
  marketingChannels: z.array(z.string().trim().max(60)).max(20).optional(),
  goals: z.array(z.string().trim().max(200)).max(10).optional(),
  challenges: z.array(z.string().trim().max(200)).max(10).optional(),
  hasValidatedMarket: z.boolean().optional(),
  isRegistered: z.boolean().optional(),
  hasFirstSale: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Noto\u2018g\u2018ri JSON');
    }
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400, { details: parsed.error.flatten() });

    const [txAgg, salesCount] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId: user.id }, _count: true, _sum: { amount: true } }),
      prisma.transaction.count({ where: { userId: user.id, type: 'income' } }),
    ]);

    const existing = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
    const idea = parsed.data.idea !== undefined ? parsed.data.idea : existing?.idea || '';

    const stage = detectBusinessStage({
      hasIdea: Boolean(idea.trim()),
      hasValidatedMarket: parsed.data.hasValidatedMarket ?? false,
      isRegistered: parsed.data.isRegistered ?? false,
      hasFirstSale: (parsed.data.hasFirstSale ?? false) || salesCount > 0,
      transactionCount: txAgg._count,
      totalRevenue: txAgg._sum.amount || 0,
    });

    const data: Record<string, unknown> = { stage };
    if (parsed.data.businessName !== undefined) data.businessName = parsed.data.businessName;
    if (parsed.data.idea !== undefined) data.idea = parsed.data.idea;
    if (parsed.data.industry !== undefined) data.industry = parsed.data.industry;
    if (parsed.data.location !== undefined) data.location = parsed.data.location;
    if (parsed.data.targetCustomer !== undefined) data.targetCustomer = parsed.data.targetCustomer;
    if (parsed.data.product !== undefined) data.product = parsed.data.product;
    if (parsed.data.service !== undefined) data.service = parsed.data.service;
    if (parsed.data.budget !== undefined) data.budget = parsed.data.budget;
    if (parsed.data.suppliers) data.suppliers = JSON.stringify(parsed.data.suppliers);
    if (parsed.data.salesChannels) data.salesChannels = JSON.stringify(parsed.data.salesChannels);
    if (parsed.data.marketingChannels) data.marketingChannels = JSON.stringify(parsed.data.marketingChannels);
    if (parsed.data.goals) data.goals = JSON.stringify(parsed.data.goals);
    if (parsed.data.challenges) data.challenges = JSON.stringify(parsed.data.challenges);

    const profile = await prisma.businessProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    await writeAudit({ userId: user.id, action: 'business_profile.updated' });
    return jsonOk({ profile: serializeProfile(profile) });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
