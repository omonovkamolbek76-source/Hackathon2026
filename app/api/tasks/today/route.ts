import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { prioritize, taskToPriorityInput } from '@/lib/ai-copilot/priority-engine';
import { jsonError, jsonOk } from '@/lib/api';

/**
 * GET /api/tasks/today — "Daily Business Coach" (section 18): turns the
 * user's existing open tasks into a prioritized today/this-week/later plan
 * using the deterministic Priority Engine (lib/ai-copilot/priority-engine.ts).
 * Does not call the AI model — this is plain, explainable scoring, so it
 * costs no AI quota and works even when Gemini is not configured.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await prisma.task.findMany({
      where: { userId: user.id, completed: false },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const prioritized = prioritize(tasks.map((t) => taskToPriorityInput(t)));
    const byId = new Map(tasks.map((t) => [t.id, t]));

    const plan = { today: [] as unknown[], this_week: [] as unknown[], later: [] as unknown[] };
    for (const item of prioritized) {
      const task = byId.get(item.id);
      if (!task) continue;
      plan[item.bucket].push({
        id: task.id,
        title: task.title,
        subtitle: task.subtitle,
        category: task.category,
        status: task.status,
        dueDate: task.dueDate,
        score: item.score,
      });
    }

    return jsonOk({ plan });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
