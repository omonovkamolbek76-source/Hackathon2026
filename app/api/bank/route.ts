import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseBankCsv } from '@/lib/csv-import';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const connections = await prisma.bankConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return jsonOk({
      connections,
      note: 'Karta raqami/CVV/OTP saqlanmaydi. V1: CSV import. V2: bank API partnerlik.',
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const connectSchema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  provider: z.enum(['csv', 'uzcard_stub', 'humo_stub']).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi');

    const conn = await prisma.bankConnection.create({
      data: {
        userId: user.id,
        provider: parsed.data.provider || 'csv',
        label: parsed.data.label || 'Bank ko‘chirma (CSV)',
        status: 'active',
        tokenHint: 'no-pan',
      },
    });
    await writeAudit({ userId: user.id, action: 'bank.connected', meta: { id: conn.id, provider: conn.provider } });
    return jsonOk({ connection: conn }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const csvImportSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `csv:${user.id}`), 10, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p so‘rov', 429);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('Noto‘g‘ri JSON');
    }
    const parsed = csvImportSchema.safeParse(body);
    if (!parsed.success) return jsonError('CSV bo‘sh yoki juda katta', 400, { details: parsed.error.flatten() });

    const rows = parseBankCsv(parsed.data.csv);
    if (rows.length === 0) return jsonError('CSV dan tranzaksiya o‘qilmadi');

    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const exists = await prisma.transaction.findFirst({
        where: { userId: user.id, externalId: row.externalId },
      });
      if (exists) {
        skipped += 1;
        continue;
      }
      await prisma.transaction.create({
        data: {
          userId: user.id,
          title: row.title,
          amount: row.amount,
          type: row.type,
          category: row.category,
          source: 'csv',
          externalId: row.externalId,
          occurredAt: row.occurredAt,
        },
      });
      created += 1;
    }

    const conn = await prisma.bankConnection.findFirst({
      where: { userId: user.id, provider: 'csv', status: 'active' },
    });
    if (conn) {
      await prisma.bankConnection.update({
        where: { id: conn.id },
        data: { lastImportAt: new Date() },
      });
    } else {
      await prisma.bankConnection.create({
        data: {
          userId: user.id,
          provider: 'csv',
          label: 'CSV import',
          status: 'active',
          lastImportAt: new Date(),
          tokenHint: 'no-pan',
        },
      });
    }

    await writeAudit({
      userId: user.id,
      action: 'bank.csv_import',
      meta: { created, skipped, total: rows.length },
    });

    return jsonOk({ created, skipped, total: rows.length });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
