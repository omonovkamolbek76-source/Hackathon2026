import { describe, expect, it } from 'vitest';
import {
  formatWelcomeMessage,
  formatOnboardingCompleteMessage,
  formatDailyCoachingTip,
  onboardingTasks,
  validateOnboardingStep,
  splitList,
} from '@/lib/onboarding';

describe('onboarding helpers', () => {
  it('requires choosing idea vs operating business first', () => {
    expect(validateOnboardingStep(0, '', {})).toMatch(/tanlang/i);
    expect(validateOnboardingStep(0, 'IDEA', {})).toBeNull();
  });

  it('requires idea details before finishing the idea path', () => {
    expect(validateOnboardingStep(1, 'IDEA', { idea: 'qisqa' })).toMatch(/10 belgi/i);
    expect(validateOnboardingStep(1, 'IDEA', { idea: 'Ekologik mahsulot yetkazib berish' })).toBeNull();
    expect(validateOnboardingStep(4, 'IDEA', { marketEntry: 'qisqa' })).toMatch(/Bozorga/i);
  });

  it('splits supplier/channel lists without inventing entries', () => {
    expect(splitList('bozor, Telegram;  do‘kon')).toEqual(['bozor', 'Telegram', 'do‘kon']);
    expect(splitList('')).toEqual([]);
  });

  it('creates tasks from the user’s own answers', () => {
    const tasks = onboardingTasks({
      path: 'IDEA',
      businessName: '',
      idea: 'Un savdosi',
      industry: '',
      location: 'Qarshi',
      targetCustomer: 'novvoylar',
      product: 'un',
      service: '',
      budget: 0,
      marketEntry: 'Mahalla va bozor',
      suppliers: ['optom baza'],
      salesChannels: ['bozor'],
      tracksFinances: false,
      goals: [],
    });
    expect(tasks.some((t) => t.title.includes('Mahalla va bozor'))).toBe(true);
    expect(tasks.some((t) => t.subtitle.includes('novvoylar'))).toBe(true);
  });
});

describe('Telegram welcome and coaching templates (platform data only)', () => {
  it('welcomes the stored name, never a made-up person', () => {
    const text = formatWelcomeMessage('Eshmatov Toshmat', 'Eco Trade');
    expect(text).toContain('Eshmatov Toshmat');
    expect(text).toContain('TadbirkorAI');
    expect(text).toContain('Eco Trade');
    expect(text).not.toMatch(/Gemini|ChatGPT/i);
  });

  it('falls back to Tadbirkor when the name is empty', () => {
    expect(formatWelcomeMessage('  ')).toContain('Tadbirkor');
  });

  it('operating-business complete message mentions finance tracking only if stored true', () => {
    const on = formatOnboardingCompleteMessage({
      path: 'OPERATING',
      businessName: 'Green Shop',
      idea: '',
      product: 'sabzavot',
      marketEntry: '',
      tracksFinances: true,
    });
    expect(on).toContain('Green Shop');
    expect(on).toContain('Mablag');
    const off = formatOnboardingCompleteMessage({
      path: 'OPERATING',
      businessName: 'Green Shop',
      idea: '',
      product: 'sabzavot',
      marketEntry: '',
      tracksFinances: false,
    });
    expect(off).toMatch(/o\u2018chiq|ochiq/i);
  });

  it('daily tip uses provided turnover and does not invent a larger number', () => {
    const text = formatDailyCoachingTip({
      path: 'OPERATING',
      stage: 'GROWING',
      idea: '',
      product: 'non',
      marketEntry: '',
      tracksFinances: true,
      todayTurnover: 1_250_000,
      todayCount: 3,
      day: '2026-08-17',
    });
    expect(text).toContain((1_250_000).toLocaleString('uz-UZ'));
    expect(text).not.toContain('999 999 999');
  });
});
