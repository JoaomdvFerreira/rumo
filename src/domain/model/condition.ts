import { z } from 'zod';

/**
 * Declarative Condition AST. Rules are data, never executable callbacks:
 * the operator set is closed so every condition can be interpreted by a
 * pure evaluator without eval/Function or dynamic dispatch to host code.
 */

const factRefSchema = z.string().min(1);

const comparableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const factEqualsSchema = z.object({
  kind: z.literal('factEquals'),
  fact: factRefSchema,
  value: comparableValueSchema,
});

const factInSchema = z.object({
  kind: z.literal('factIn'),
  fact: factRefSchema,
  values: z.array(comparableValueSchema).min(1),
});

const factTruthySchema = z.object({
  kind: z.literal('factTruthy'),
  fact: factRefSchema,
});

const factPresentSchema = z.object({
  kind: z.literal('factPresent'),
  fact: factRefSchema,
});

export type ConditionLeaf =
  | z.infer<typeof factEqualsSchema>
  | z.infer<typeof factInSchema>
  | z.infer<typeof factTruthySchema>
  | z.infer<typeof factPresentSchema>;

export type Condition =
  | ConditionLeaf
  | { kind: 'allOf'; conditions: Condition[] }
  | { kind: 'anyOf'; conditions: Condition[] }
  | { kind: 'not'; condition: Condition };

const conditionLeafSchema: z.ZodType<ConditionLeaf> = z.union([
  factEqualsSchema,
  factInSchema,
  factTruthySchema,
  factPresentSchema,
]);

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    conditionLeafSchema,
    z.object({
      kind: z.literal('allOf'),
      conditions: z.array(conditionSchema).min(1),
    }),
    z.object({
      kind: z.literal('anyOf'),
      conditions: z.array(conditionSchema).min(1),
    }),
    z.object({
      kind: z.literal('not'),
      condition: conditionSchema,
    }),
  ]),
);

export const CONDITION_OPERATORS = [
  'factEquals',
  'factIn',
  'factTruthy',
  'factPresent',
  'allOf',
  'anyOf',
  'not',
] as const;
