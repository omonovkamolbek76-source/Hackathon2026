/**
 * Deterministic, explainable task-priority scoring — weighs Impact, Urgency,
 * and Risk positively and Cost and Difficulty negatively (all 1-5 scales),
 * then buckets the ranked list into today / this_week / later. Not a black
 * box: every factor and its weight is visible here and can be explained to
 * the user ("bugun, chunki ta'siri katta va kechiktirish xavfli").
 */

export type PriorityInput = {
  id: string;
  title: string;
  impact: number;
  urgency: number;
  cost: number;
  risk: number;
  difficulty: number;
};

export type PriorityBucket = 'today' | 'this_week' | 'later';

export type PrioritizedItem = PriorityInput & { score: number; bucket: PriorityBucket };

function clamp1to5(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}

export function scoreItem(item: Pick<PriorityInput, 'impact' | 'urgency' | 'cost' | 'risk' | 'difficulty'>): number {
  const impact = clamp1to5(item.impact);
  const urgency = clamp1to5(item.urgency);
  const risk = clamp1to5(item.risk);
  const cost = clamp1to5(item.cost);
  const difficulty = clamp1to5(item.difficulty);
  return impact * 2 + urgency * 2 + risk * 1.5 - cost * 1 - difficulty * 1;
}

export function prioritize(items: PriorityInput[]): PrioritizedItem[] {
  const scored = items
    .map((item) => ({ ...item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score);

  const n = scored.length;
  return scored.map((item, i) => {
    let bucket: PriorityBucket;
    if (n <= 3) {
      bucket = i === 0 ? 'today' : 'this_week';
    } else if (i < Math.ceil(n * 0.2)) {
      bucket = 'today';
    } else if (i < Math.ceil(n * 0.5)) {
      bucket = 'this_week';
    } else {
      bucket = 'later';
    }
    return { ...item, bucket };
  });
}

/** Maps an existing Task's category/status/dueDate into priority factors (1-5 each). */
export function taskToPriorityInput(task: {
  id: string;
  title: string;
  category: string;
  status: string;
}): PriorityInput {
  const impactByCategory: Record<string, number> = {
    tax: 4,
    bank: 3,
    hr: 3,
    supply: 3,
    marketing: 2,
    planning: 2,
  };
  const riskByCategory: Record<string, number> = {
    tax: 5,
    bank: 3,
    hr: 3,
    supply: 3,
    marketing: 2,
    planning: 2,
  };
  const urgencyByStatus: Record<string, number> = {
    overdue: 5,
    today: 4,
    upcoming: 2,
    completed: 1,
  };

  return {
    id: task.id,
    title: task.title,
    impact: impactByCategory[task.category] ?? 2,
    urgency: urgencyByStatus[task.status] ?? 2,
    risk: riskByCategory[task.category] ?? 2,
    cost: 2,
    difficulty: 2,
  };
}
