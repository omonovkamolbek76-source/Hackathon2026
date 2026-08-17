import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { proposedActionSchema } from '@/lib/ai-copilot/actions';
import { writeAudit } from '@/lib/audit';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';

/**
 * POST /api/coach/actions
 *
 * Executes a structured action the AI copilot proposed, ONLY after the user
 * has explicitly confirmed it (section 55): AI -> Structured Action ->
 * Validation (again, server-side, from scratch) -> User Confirmation ->
 * Execute. The action payload is re-validated here independently of
 * whatever the AI or client claims — it is never trusted as-is.
 */
const requestSchema = z.object({
  action: z.unknown(),
  confirm: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `coach-action:${user.id}`), 20, 60_000);
    if (!rl.ok) return jsonError('Juda ko\u2018p so\u2018rov', 429);

    const body = await request.json().catch(() => ({}));
    const parsedReq = requestSchema.safeParse(body);
    if (!parsedReq.success) return jsonError('Tasdiqlash talab qilinadi', 400);

    const parsedAction = proposedActionSchema.safeParse(parsedReq.data.action);
    if (!parsedAction.success) return jsonError('Amal noto\u2018g\u2018ri formatda', 400);
    const action = parsedAction.data;

    if (action.intent === 'create_task') {
      const task = await prisma.task.create({
        data: {
          userId: user.id,
          title: action.data.title,
          subtitle: action.data.subtitle || '',
          category: action.data.category || 'planning',
          status: 'today',
          dueDate: 'Bugun',
        },
      });
      await writeAudit({ userId: user.id, action: 'ai.action_executed', meta: { intent: 'create_task', taskId: task.id } });
      return jsonOk({ ok: true, result: { type: 'task', task } });
    }

    if (action.intent === 'create_transaction') {
      const tx = await prisma.transaction.create({
        data: {
          userId: user.id,
          title: action.data.title,
          amount: action.data.amount,
          type: action.data.type,
          category: action.data.category || 'other',
          source: 'ai',
        },
      });
      await writeAudit({
        userId: user.id,
        action: 'ai.action_executed',
        meta: { intent: 'create_transaction', transactionId: tx.id },
      });
      return jsonOk({ ok: true, result: { type: 'transaction', transaction: tx } });
    }

    return jsonError('Noma\u2018lum amal', 400);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
