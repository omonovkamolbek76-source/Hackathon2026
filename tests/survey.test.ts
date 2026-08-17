import { describe, expect, it } from 'vitest';
import {
  SURVEY_STEPS,
  isSurveyComplete,
  formatTopicDigest,
  parseSurveyAnswers,
  profilePatchFromSurvey,
  surveyTasks,
} from '@/lib/survey';

describe('button-first survey', () => {
  it('has a button set on every question', () => {
    expect(SURVEY_STEPS.length).toBeGreaterThanOrEqual(5);
    for (const step of SURVEY_STEPS) {
      expect(step.buttons.length).toBeGreaterThanOrEqual(2);
      expect(step.question.length).toBeGreaterThan(8);
    }
  });

  it('is complete only when every step has an answer', () => {
    expect(isSurveyComplete({})).toBe(false);
    expect(
      isSurveyComplete({
        path: 'G‘oyam bor',
        industry: 'Savdo',
        product: 'Un',
        market: 'Bozor',
        legal: 'YaTT',
        finance: 'Ha, yuritaman',
      }),
    ).toBe(true);
  });

  it('maps path to a stored stage without inventing extra facts', () => {
    expect(profilePatchFromSurvey({ path: 'Ishlab turgan biznes' }).stage).toBe('EARLY_SALES');
    expect(profilePatchFromSurvey({ path: 'G‘oyam bor' }).stage).toBe('IDEA');
  });

  it('creates legal/finance tasks from stored answers only', () => {
    const tasks = surveyTasks({ legal: 'Hali ro‘yxatdan o‘tmagan', finance: 'Hali yo‘q', market: 'Telegram' });
    expect(tasks.some((t) => t.category === 'tax')).toBe(true);
    expect(tasks.some((t) => t.title.includes('Telegram'))).toBe(true);
  });
});

describe('topic digest for Telegram (templates, not LLM)', () => {
  it('includes legal, finance and market lines from stored answers', () => {
    const text = formatTopicDigest({
      day: '2026-08-17',
      answers: { legal: 'YaTT', finance: 'Ha, yuritaman', product: 'un', market: 'Bozor', industry: 'Savdo' },
      todayTurnover: 1_250_000,
      todayCount: 2,
      overdueCount: 1,
    });
    expect(text).toContain('YaTT');
    expect(text).toContain((1_250_000).toLocaleString('uz-UZ'));
    expect(text).toContain('un');
    expect(text).toContain('Kechikkan vazifalar: 1');
    expect(text).not.toMatch(/Gemini|ChatGPT/i);
  });

  it('parses empty survey JSON safely', () => {
    expect(parseSurveyAnswers('')).toEqual({});
    expect(parseSurveyAnswers('not-json')).toEqual({});
  });
});
