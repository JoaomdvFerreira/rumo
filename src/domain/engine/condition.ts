import type { Condition } from '../model/condition';
import type { FactSet, FactValue } from '../model/fact';

/**
 * Pure, deterministic, side-effect-free Condition evaluator. No eval/Function,
 * no dynamic dispatch to host code: every operator is a closed case over the
 * Condition AST (see model/condition.ts).
 *
 * A missing fact is never coerced to a value -- it is treated as "not
 * present" by every operator that reads it (factEquals/factIn/factContains
 * are false, factPresent is false, factTruthy is false).
 */

function readFact(facts: FactSet, key: string): FactValue | undefined {
  return Object.prototype.hasOwnProperty.call(facts, key) ? facts[key] : undefined;
}

/**
 * Explicit business truthiness, deliberately distinct from JavaScript
 * truthiness: absent, false, 0, "", and [] are false; every other value
 * (including non-empty arrays) is true.
 */
export function isFactTruthy(value: FactValue | undefined): boolean {
  if (value === undefined) return false;
  if (value === false) return false;
  if (value === 0) return false;
  if (value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function evaluateCondition(condition: Condition, facts: FactSet): boolean {
  switch (condition.kind) {
    case 'factEquals': {
      const actual = readFact(facts, condition.fact);
      return actual !== undefined && actual === condition.value;
    }
    case 'factIn': {
      const actual = readFact(facts, condition.fact);
      if (actual === undefined || Array.isArray(actual)) return false;
      return condition.values.includes(actual);
    }
    case 'factContains': {
      const actual = readFact(facts, condition.fact);
      if (!Array.isArray(actual)) return false;
      return actual.includes(condition.value);
    }
    case 'factTruthy': {
      return isFactTruthy(readFact(facts, condition.fact));
    }
    case 'factPresent': {
      return readFact(facts, condition.fact) !== undefined;
    }
    case 'allOf': {
      return condition.conditions.every((child) => evaluateCondition(child, facts));
    }
    case 'anyOf': {
      return condition.conditions.some((child) => evaluateCondition(child, facts));
    }
    case 'not': {
      return !evaluateCondition(condition.condition, facts);
    }
  }
}

/**
 * A missing/undefined `appliesWhen` means the entity always applies -- the
 * condition is optional at the content layer (see Route, Requirement, Step).
 */
export function isApplicable(appliesWhen: Condition | undefined, facts: FactSet): boolean {
  if (appliesWhen === undefined) return true;
  return evaluateCondition(appliesWhen, facts);
}
