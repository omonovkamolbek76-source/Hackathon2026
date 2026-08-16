import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    await requireUser();
    const products = await prisma.creditProduct.findMany({
      where: { active: true },
      orderBy: { interestRate: 'asc' },
    });
    return jsonOk({
      products: products.map((p: {
        id: string;
        name: string;
        bank: string;
        amountMin: number;
        amountMax: number;
        interestRate: number;
        termMonths: number;
        gracePeriod: number;
        collateral: string;
        purposeTags: string;
        sourceNote: string;
      }) => ({
        id: p.id,
        name: p.name,
        bank: p.bank,
        amountMin: p.amountMin,
        amountMax: p.amountMax,
        interestRate: p.interestRate,
        termMonths: p.termMonths,
        gracePeriod: p.gracePeriod,
        collateral: p.collateral,
        purpose: p.purposeTags,
        sourceNote: p.sourceNote,
        matchScore: 0,
        recommendedReason: p.sourceNote,
      })),
      disclaimer:
        'Bu katalog namuna ma’lumotlarga asoslangan. Stavka va shartlarni rasmiy manbalarda (masalan oilakredit.uz) tasdiqlang. Kredit kafolatlanmaydi.',
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
