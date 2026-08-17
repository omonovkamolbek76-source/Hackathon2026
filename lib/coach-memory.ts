import { prisma } from '@/lib/db';
import { extractCoachFacts } from '@/lib/coach-extract';

function shouldReplaceIdea(existing: string | undefined, next: string): boolean {
  const prev = (existing || '').trim();
  if (!next.trim()) return false;
  if (!prev || prev.length < 12) return true;
  if (/^g['\u2018\u2019]?oyam bor$/i.test(prev)) return true;
  return false;
}

/**
 * Save facts the owner already said in chat (name, idea, product) so the
 * next turn does not re-ask. Least-data: no invented numbers; capital is a
 * text note only (500 milliard would overflow Int budget).
 */
export async function persistCoachFacts(userId: string, message: string): Promise<void> {
  const facts = extractCoachFacts(message);
  if (!facts.ownerName && !facts.idea && !facts.product && !facts.capitalNote) return;

  if (facts.ownerName) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: facts.ownerName },
    });
  }

  if (!facts.idea && !facts.product && !facts.capitalNote && !facts.industry) return;

  const existing = await prisma.businessProfile.findUnique({ where: { userId } });
  const ideaParts = [
    facts.idea || '',
    facts.capitalNote ? `Mablag': ${facts.capitalNote}` : '',
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  const idea = ideaParts.join('. ');
  const nextIdea = shouldReplaceIdea(existing?.idea, idea) ? idea : existing?.idea || idea;

  await prisma.businessProfile.upsert({
    where: { userId },
    update: {
      idea: nextIdea || existing?.idea || '',
      product: facts.product || existing?.product || '',
      industry: facts.industry || existing?.industry || '',
    },
    create: {
      userId,
      idea: idea || '',
      product: facts.product || '',
      industry: facts.industry || '',
      stage: 'IDEA',
    },
  });
}
