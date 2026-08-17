import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError, jsonOk } from '@/lib/api';
import { SURVEY_STEPS, parseSurveyAnswers } from '@/lib/survey';
import { applySurveyAnswer } from '@/lib/survey-store';
import { writeAudit } from '@/lib/audit';

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
    const answers = parseSurveyAnswers(profile?.surveyAnswers);
    const step = profile?.surveyStep ?? 0;
    const current = SURVEY_STEPS[step];
    return jsonOk({
      done: Boolean(profile?.surveyDone),
      dismissed: Boolean(profile?.surveyDismissed),
      step,
      total: SURVEY_STEPS.length,
      question: current?.question ?? null,
      hint: current?.hint ?? null,
      buttons: current?.buttons ?? [],
      key: current?.key ?? null,
      answers,
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const postSchema = z.object({
  action: z.enum(['answer', 'dismiss']),
  value: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400);

    if (parsed.data.action === 'dismiss') {
      await prisma.businessProfile.upsert({
        where: { userId: user.id },
        update: { surveyDismissed: true },
        create: { userId: user.id, surveyDismissed: true },
      });
      return jsonOk({ ok: true, dismissed: true });
    }

    const value = (parsed.data.value || '').trim();
    if (value.length < 1) return jsonError('Javob tanlang yoki yozing', 400);

    const result = await applySurveyAnswer(user.id, value);
    if (result.done) await writeAudit({ userId: user.id, action: 'survey.completed' });
    return jsonOk({ ok: true, ...result });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
