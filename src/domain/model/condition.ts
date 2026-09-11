import { z } from 'zod';

/**
 * Declarative Condition AST. Rules are data, never executable callbacks:
 * the operator set is closed so every condition can be interpreted by a
 * pure evaluator without eval/Function or dynamic dispatch to host code.
 * No redundant negative operators (e.g. factNotEquals) are added; `not`
 * composes every negative case over the positive primitives.
 */

const factRefSchema = z.string().min(1);

const comparableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const factEqualsSchema = z.strictObject({
  kind: z.literal('factEquals'),
  fact: factRefSchema,
  value: comparableValueSchema,
});

const factInSchema = z.strictObject({
  kind: z.literal('factIn'),
  fact: factRefSchema,
  values: z.array(comparableValueSchema).min(1),
});

const factContainsSchema = z.strictObject({
  kind: z.literal('factContains'),
  fact: factRefSchema,
  value: comparableValueSchema,
});

const factTruthySchema = z.strictObject({
  kind: z.literal('factTruthy'),
  fact: factRefSchema,
});

const factPresentSchema = z.strictObject({
  kind: z.literal('factPresent'),
  fact: factRefSchema,
});

export type ConditionLeaf =
  | z.infer<typeof factEqualsSchema>
  | z.infer<typeof factInSchema>
  | z.infer<typeof factContainsSchema>
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
  factContainsSchema,
  factTruthySchema,
  factPresentSchema,
]);

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    conditionLeafSchema,
    z.strictObject({
      kind: z.literal('allOf'),
      conditions: z.array(conditionSchema).min(1),
    }),
    z.strictObject({
      kind: z.literal('anyOf'),
      conditions: z.array(conditionSchema).min(1),
    }),
    z.strictObject({
      kind: z.literal('not'),
      condition: conditionSchema,
    }),
  ]),
);

export const CONDITION_OPERATORS = [
  'factEquals',
  'factIn',
  'factContains',
  'factTruthy',
  'factPresent',
  'allOf',
  'anyOf',
  'not',
] as const;
