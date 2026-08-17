import { z } from 'zod';

/**
 * Structured AI actions (section 32/55 of the spec): the model may PROPOSE
 * one of these, but nothing is ever executed from AI output directly.
 * Flow: AI proposes -> server validates against this schema -> client shows
 * an explicit confirmation UI -> POST /api/coach/actions with the user's
 * confirmation -> only then does the server perform the DB write.
 *
 * Keep this list small and deliberate; every new action type is a new
 * server-side capability the AI can eventually trigger, so it must be
 * reviewed like any other authorization boundary.
 */

export const createTaskActionSchema = z.object({
  intent: z.literal('create_task'),
  confidence: z.number().min(0).max(1),
  requires_confirmation: z.literal(true),
  data: z.object({
    title: z.string().trim().min(2).max(120),
    subtitle: z.string().trim().max(200).optional().default(''),
    category: z.enum(['tax', 'bank', 'hr', 'supply', 'marketing', 'planning']).optional().default('planning'),
  }),
});

export const createTransactionActionSchema = z.object({
  intent: z.literal('create_transaction'),
  confidence: z.number().min(0).max(1),
  requires_confirmation: z.literal(true),
  data: z.object({
    title: z.string().trim().min(2).max(120),
    amount: z.coerce.number().int().positive().max(1_000_000_000),
    type: z.enum(['income', 'expense']),
    category: z.string().trim().max(40).optional().default('other'),
  }),
});

export const proposedActionSchema = z.discriminatedUnion('intent', [
  createTaskActionSchema,
  createTransactionActionSchema,
]);

export type ProposedAction = z.infer<typeof proposedActionSchema>;

/** Best-effort parse from an untrusted `unknown` (e.g. AI-generated JSON) — never throws. */
export function tryParseProposedAction(value: unknown): ProposedAction | null {
  const result = proposedActionSchema.safeParse(value);
  return result.success ? result.data : null;
}
