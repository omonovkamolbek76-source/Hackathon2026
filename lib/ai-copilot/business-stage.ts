/**
 * Deterministic business-stage classifier — a documented heuristic, NOT a
 * machine-learning model. Thresholds are intentionally simple and legible so
 * they can be explained to a user and adjusted with evidence over time.
 */

export type BusinessStage = 'IDEA' | 'VALIDATION' | 'STARTING' | 'EARLY_SALES' | 'GROWING' | 'ESTABLISHED';

export type BusinessStageInput = {
  hasIdea: boolean;
  hasValidatedMarket: boolean;
  isRegistered: boolean;
  hasFirstSale: boolean;
  /** Total transaction count recorded (all-time or a recent rolling window). */
  transactionCount: number;
  /** Total income recorded (in the same window as transactionCount). */
  totalRevenue: number;
};

const ESTABLISHED_TRANSACTION_THRESHOLD = 60;

export function detectBusinessStage(input: BusinessStageInput): BusinessStage {
  const { hasIdea, hasValidatedMarket, isRegistered, hasFirstSale, transactionCount, totalRevenue } = input;

  if (!hasIdea) return 'IDEA';
  if (!hasValidatedMarket) return 'VALIDATION';
  if (!isRegistered && !hasFirstSale) return 'STARTING';
  if (hasFirstSale && transactionCount < 20) return 'EARLY_SALES';
  if (transactionCount >= 20 && totalRevenue > 0) {
    return transactionCount >= ESTABLISHED_TRANSACTION_THRESHOLD ? 'ESTABLISHED' : 'GROWING';
  }
  return 'STARTING';
}

export const BUSINESS_STAGE_LABELS: Record<BusinessStage, string> = {
  IDEA: 'G\u2018oya',
  VALIDATION: 'Tekshirish',
  STARTING: 'Boshlash',
  EARLY_SALES: 'Birinchi sotuvlar',
  GROWING: 'O\u2018sish',
  ESTABLISHED: 'Barqaror',
};
