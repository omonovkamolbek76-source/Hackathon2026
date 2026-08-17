import { prisma } from '@/lib/db';
import {
  SURVEY_STEPS,
  isSurveyComplete,
  nextSurveyStep,
  parseSurveyAnswers,
  profilePatchFromSurvey,
  surveyTasks,
  type SurveyAnswers,
} from '@/lib/survey';

/** If `text` matches the current survey step button, record it. Free-text in AI does not auto-advance. */
export async function ingestSurveyButton(userId: string, text: string): Promise<void> {
  const value = text.trim();
  if (!value) return;
  const existing = await prisma.businessProfile.findUnique({ where: { userId } });
  if (existing?.surveyDone || existing?.surveyDismissed) return;
  const step = existing?.surveyStep ?? 0;
  const current = SURVEY_STEPS[step];
  if (!current) return;
  const matched = current.buttons.some((b) => b.toLowerCase() === value.toLowerCase());
  if (!matched) return;
  await applySurveyAnswer(userId, value);
}

export async function applySurveyAnswer(userId: string, value: string): Promise<{ done: boolean; step: number }> {
  const existing = await prisma.businessProfile.findUnique({ where: { userId } });
  const step = existing?.surveyStep ?? 0;
  const current = SURVEY_STEPS[step];
  if (!current) return { done: true, step: SURVEY_STEPS.length };

  const answers: SurveyAnswers = { ...parseSurveyAnswers(existing?.surveyAnswers), [current.key]: value };
  const next = nextSurveyStep(answers, step);
  const done = next >= SURVEY_STEPS.length || isSurveyComplete(answers);
  const patch = profilePatchFromSurvey(answers);

  await prisma.businessProfile.upsert({
    where: { userId },
    update: {
      surveyAnswers: JSON.stringify(answers),
      surveyStep: done ? SURVEY_STEPS.length : next,
      surveyDone: done,
      idea: patch.idea ?? existing?.idea ?? '',
      industry: patch.industry ?? existing?.industry ?? '',
      product: patch.product ?? existing?.product ?? '',
      salesChannels: patch.salesChannels ? JSON.stringify(patch.salesChannels) : existing?.salesChannels,
      stage: patch.stage ?? existing?.stage,
    },
    create: {
      userId,
      surveyAnswers: JSON.stringify(answers),
      surveyStep: done ? SURVEY_STEPS.length : next,
      surveyDone: done,
      idea: patch.idea || '',
      industry: patch.industry || '',
      product: patch.product || '',
      salesChannels: JSON.stringify(patch.salesChannels || []),
      stage: patch.stage || 'IDEA',
    },
  });

  if (done) {
    const open = await prisma.task.count({ where: { userId, completed: false } });
    if (open < 8) {
      await prisma.task.createMany({
        data: surveyTasks(answers).map((t) => ({
          userId,
          title: t.title,
          subtitle: t.subtitle,
          category: t.category,
          status: 'today',
        })),
      });
    }
  }

  return { done, step: done ? SURVEY_STEPS.length : next };
}
