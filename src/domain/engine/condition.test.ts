import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { evaluateCondition, isApplicable, isFactTruthy } from './condition';
import type { Condition } from '../model/condition';
import type { FactSet, FactValue } from '../model/fact';

describe('evaluateCondition', () => {
  describe('factEquals', () => {
    it('is true for exact primitive equality', () => {
      const condition: Condition = { kind: 'factEquals', fact: 'household.municipality', value: 'evora' };
      expect(evaluateCondition(condition, { 'household.municipality': 'evora' })).toBe(true);
    });

    it('is false for a mismatched value', () => {
      const condition: Condition = { kind: 'factEquals', fact: 'household.municipality', value: 'evora' };
      expect(evaluateCondition(condition, { 'household.municipality': 'lisboa' })).toBe(false);
    });

    it('is false when the fact is absent', () => {
      const condition: Condition = { kind: 'factEquals', fact: 'household.municipality', value: 'evora' };
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('does not coerce types across the comparison', () => {
      const condition: Condition = { kind: 'factEquals', fact: 'household.size', value: '1' };
      expect(evaluateCondition(condition, { 'household.size': 1 })).toBe(false);
    });
  });

  describe('factIn', () => {
    it('is true when the scalar fact is one of the declared candidates', () => {
      const condition: Condition = { kind: 'factIn', fact: 'household.municipality', values: ['evora', 'lisboa'] };
      expect(evaluateCondition(condition, { 'household.municipality': 'evora' })).toBe(true);
    });

    it('is false when the fact is not among the candidates', () => {
      const condition: Condition = { kind: 'factIn', fact: 'household.municipality', values: ['evora', 'lisboa'] };
      expect(evaluateCondition(condition, { 'household.municipality': 'porto' })).toBe(false);
    });

    it('is false when the fact is absent', () => {
      const condition: Condition = { kind: 'factIn', fact: 'household.municipality', values: ['evora'] };
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('is false when the runtime fact is an array rather than a scalar', () => {
      const condition: Condition = { kind: 'factIn', fact: 'services.selected', values: ['water'] };
      expect(evaluateCondition(condition, { 'services.selected': ['water'] })).toBe(false);
    });
  });

  describe('factContains', () => {
    it('is true when the array fact contains the declared primitive', () => {
      const condition: Condition = { kind: 'factContains', fact: 'services.selected', value: 'water' };
      expect(evaluateCondition(condition, { 'services.selected': ['water', 'electricity'] })).toBe(true);
    });

    it('is false when the array fact does not contain the value', () => {
      const condition: Condition = { kind: 'factContains', fact: 'services.selected', value: 'gas' };
      expect(evaluateCondition(condition, { 'services.selected': ['water', 'electricity'] })).toBe(false);
    });

    it('is false when the fact is absent', () => {
      const condition: Condition = { kind: 'factContains', fact: 'services.selected', value: 'gas' };
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('is false when the runtime fact is a scalar rather than an array', () => {
      const condition: Condition = { kind: 'factContains', fact: 'services.selected', value: 'gas' };
      expect(evaluateCondition(condition, { 'services.selected': 'gas' })).toBe(false);
    });
  });

  describe('factPresent', () => {
    it('is true when the fact key exists regardless of truthiness', () => {
      const condition: Condition = { kind: 'factPresent', fact: 'household.isUrgent' };
      expect(evaluateCondition(condition, { 'household.isUrgent': false })).toBe(true);
      expect(evaluateCondition(condition, { 'household.isUrgent': 0 })).toBe(true);
      expect(evaluateCondition(condition, { 'household.isUrgent': '' })).toBe(true);
    });

    it('is false when the fact key is absent', () => {
      const condition: Condition = { kind: 'factPresent', fact: 'household.isUrgent' };
      expect(evaluateCondition(condition, {})).toBe(false);
    });
  });

  describe('factTruthy business semantics', () => {
    it.each<[FactValue | undefined, boolean]>([
      [undefined, false],
      [false, false],
      [0, false],
      ['', false],
      [[], false],
      [true, true],
      [1, true],
      ['x', true],
      [['a'], true],
      [[0], true],
    ])('treats %p as %p', (value, expected) => {
      expect(isFactTruthy(value)).toBe(expected);
    });

    it('evaluates factTruthy using explicit business truthiness, not JS truthiness', () => {
      const condition: Condition = { kind: 'factTruthy', fact: 'services.selected' };
      const facts: FactSet = {};
      expect(evaluateCondition(condition, { ...facts, 'services.selected': [] })).toBe(false);
    });
  });

  describe('recursive compositions', () => {
    it('allOf requires every child condition to be true', () => {
      const condition: Condition = {
        kind: 'allOf',
        conditions: [
          { kind: 'factTruthy', fact: 'a' },
          { kind: 'factTruthy', fact: 'b' },
        ],
      };
      expect(evaluateCondition(condition, { a: true, b: true })).toBe(true);
      expect(evaluateCondition(condition, { a: true, b: false })).toBe(false);
    });

    it('anyOf requires at least one child condition to be true', () => {
      const condition: Condition = {
        kind: 'anyOf',
        conditions: [
          { kind: 'factTruthy', fact: 'a' },
          { kind: 'factTruthy', fact: 'b' },
        ],
      };
      expect(evaluateCondition(condition, { a: false, b: true })).toBe(true);
      expect(evaluateCondition(condition, { a: false, b: false })).toBe(false);
    });

    it('not inverts the inner condition', () => {
      const condition: Condition = { kind: 'not', condition: { kind: 'factTruthy', fact: 'a' } };
      expect(evaluateCondition(condition, { a: true })).toBe(false);
      expect(evaluateCondition(condition, {})).toBe(true);
    });

    it('composes deeply nested allOf/anyOf/not deterministically', () => {
      const condition: Condition = {
        kind: 'allOf',
        conditions: [
          { kind: 'not', condition: { kind: 'factEquals', fact: 'x', value: 'blocked' } },
          {
            kind: 'anyOf',
            conditions: [
              { kind: 'factIn', fact: 'y', values: ['a', 'b'] },
              { kind: 'factContains', fact: 'z', value: 'c' },
            ],
          },
        ],
      };
      expect(evaluateCondition(condition, { x: 'ok', y: 'a', z: [] })).toBe(true);
      expect(evaluateCondition(condition, { x: 'blocked', y: 'a', z: [] })).toBe(false);
      expect(evaluateCondition(condition, { x: 'ok', y: 'nope', z: ['c'] })).toBe(true);
      expect(evaluateCondition(condition, { x: 'ok', y: 'nope', z: ['d'] })).toBe(false);
    });
  });

  it('is side-effect free: never mutates the input fact set', () => {
    const facts: FactSet = { a: true, b: [1, 2] };
    const snapshot = structuredClone(facts);
    const condition: Condition = {
      kind: 'allOf',
      conditions: [{ kind: 'factTruthy', fact: 'a' }, { kind: 'factContains', fact: 'b', value: 1 }],
    };
    evaluateCondition(condition, facts);
    expect(facts).toEqual(snapshot);
  });
});

describe('isApplicable', () => {
  it('is true when appliesWhen is undefined', () => {
    expect(isApplicable(undefined, {})).toBe(true);
  });

  it('delegates to evaluateCondition when appliesWhen is present', () => {
    expect(isApplicable({ kind: 'factTruthy', fact: 'a' }, { a: true })).toBe(true);
    expect(isApplicable({ kind: 'factTruthy', fact: 'a' }, {})).toBe(false);
  });
});

const primitiveArb = fc.oneof(fc.string(), fc.integer(), fc.boolean());
const factValueArb: fc.Arbitrary<FactValue> = fc.oneof(primitiveArb, fc.array(primitiveArb, { maxLength: 5 }));

const conditionArb: fc.Arbitrary<Condition> = fc.letrec<{ condition: Condition }>((tie) => ({
  condition: fc.oneof(
    { depthSize: 'small' },
    fc.record({ kind: fc.constant('factEquals' as const), fact: fc.string({ minLength: 1 }), value: primitiveArb }),
    fc.record({
      kind: fc.constant('factIn' as const),
      fact: fc.string({ minLength: 1 }),
      values: fc.array(primitiveArb, { minLength: 1, maxLength: 5 }),
    }),
    fc.record({ kind: fc.constant('factContains' as const), fact: fc.string({ minLength: 1 }), value: primitiveArb }),
    fc.record({ kind: fc.constant('factTruthy' as const), fact: fc.string({ minLength: 1 }) }),
    fc.record({ kind: fc.constant('factPresent' as const), fact: fc.string({ minLength: 1 }) }),
    fc.record({ kind: fc.constant('allOf' as const), conditions: fc.array(tie('condition'), { minLength: 1, maxLength: 3 }) }),
    fc.record({ kind: fc.constant('anyOf' as const), conditions: fc.array(tie('condition'), { minLength: 1, maxLength: 3 }) }),
    fc.record({ kind: fc.constant('not' as const), condition: tie('condition') }),
  ),
})).condition;

const factSetArb: fc.Arbitrary<FactSet> = fc.dictionary(fc.string({ minLength: 1 }), factValueArb, { maxKeys: 6 });

describe('evaluateCondition property invariants', () => {
  it('is deterministic: the same condition and facts always produce the same result', () => {
    fc.assert(
      fc.property(conditionArb, factSetArb, (condition, facts) => {
        const first = evaluateCondition(condition, facts);
        const second = evaluateCondition(condition, facts);
        expect(second).toBe(first);
      }),
    );
  });

  it('never mutates the input fact set for any generated condition', () => {
    fc.assert(
      fc.property(conditionArb, factSetArb, (condition, facts) => {
        const snapshot = structuredClone(facts);
        evaluateCondition(condition, facts);
        expect(facts).toEqual(snapshot);
      }),
    );
  });

  it('not(condition) is always the logical negation of condition', () => {
    fc.assert(
      fc.property(conditionArb, factSetArb, (condition, facts) => {
        const direct = evaluateCondition(condition, facts);
        const negated = evaluateCondition({ kind: 'not', condition }, facts);
        expect(negated).toBe(!direct);
      }),
    );
  });

  it('allOf of a single condition equals that condition', () => {
    fc.assert(
      fc.property(conditionArb, factSetArb, (condition, facts) => {
        const direct = evaluateCondition(condition, facts);
        const wrapped = evaluateCondition({ kind: 'allOf', conditions: [condition] }, facts);
        expect(wrapped).toBe(direct);
      }),
    );
  });

  it('every leaf operator is false against an empty fact set', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), primitiveArb, (fact, value) => {
        expect(evaluateCondition({ kind: 'factEquals', fact, value }, {})).toBe(false);
        expect(evaluateCondition({ kind: 'factIn', fact, values: [value] }, {})).toBe(false);
        expect(evaluateCondition({ kind: 'factContains', fact, value }, {})).toBe(false);
        expect(evaluateCondition({ kind: 'factTruthy', fact }, {})).toBe(false);
        expect(evaluateCondition({ kind: 'factPresent', fact }, {})).toBe(false);
      }),
    );
  });
});
