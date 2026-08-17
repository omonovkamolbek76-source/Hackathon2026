import type { ScreenId } from '@/types';

/**
 * Maps a business utterance (typed or transcribed voice) to a platform
 * screen the coach can send the user to. Returns null when the message is
 * in-scope but does not name a specific screen.
 */
export function detectPlatformRoute(text: string): { screen: ScreenId; label: string } | null {
  const t = text.trim();
  if (/kredit|qarz|moliyalashtirish/i.test(t)) return { screen: 'credit-matching', label: 'Kredit topish' };
  if (/biznes\s*reja|reja\s*(yarat|yoz)/i.test(t)) return { screen: 'business-plan', label: 'Biznes reja' };
  if (/x[\s-]?hisobot|z[\s-]?hisobot|aylanma|ochchot|hisob[\s-]?kitob/i.test(t)) return { screen: 'analytics', label: 'Tahlil' };
  if (/tahlil|kirim|chiqim|foyda|xarajat/i.test(t) && !/kredit/i.test(t)) return { screen: 'analytics', label: 'Tahlil' };
  if (/vazifa|bugungi\s+ish|nima\s+qilishim/i.test(t)) return { screen: 'tasks', label: 'Vazifalar' };
  if (/obuna|tarif|subscription/i.test(t)) return { screen: 'subscription', label: 'Obuna' };
  return null;
}
