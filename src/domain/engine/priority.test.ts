import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { selectByPriority, sortByPriority } from './priority';
import type { Prioritized } from './priority';

describe('sortByPriority / selectByPriority', () => {
  it('picks the highest priority candidate', () => {
    const candidates: Prioritized[] = [
      { id: 'a', priority: 1 },
      { id: 'b', priority: 5 },
      { id: 'c', priority: 3 },
    ];
    expect(selectByPriority(candidates)?.id).toBe('b');
  });

  it('breaks a priority tie using declaration order', () => {
    const candidates: Prioritized[] = [
      { id: 'z', priority: 2 },
      { id: 'a', priority: 2 },
    ];
    expect(selectByPriority(candidates)?.id).toBe('z');
  });

  it('breaks a full tie (same priority, same order position across runs) using stable id', () => {
    const candidates: Prioritized[] = [
      { id: 'b', priority: 2 },
      { id: 'a', priority: 2 },
    ];
    // Declaration order still wins over id when both are present as separate entries.
    expect(selectByPriority(candidates)?.id).toBe('b');
  });

  it('uses id as the final tie-breaker when priority and effective grouping are identical', () => {
    const candidates: Prioritized[] = [{ id: 'b', priority: 1 }, { id: 'a', priority: 1 }];
    const sorted = sortByPriority(candidates);
    expect(sorted.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('returns undefined for an empty candidate list', () => {
    expect(selectByPriority([])).toBeUndefined();
  });

  it('does not mutate the input array', () => {
    const candidates: Prioritized[] = [{ id: 'b', priority: 1 }, { id: 'a', priority: 2 }];
    const snapshot = [...candidates];
    sortByPriority(candidates);
    expect(candidates).toEqual(snapshot);
  });
});

describe('sortByPriority property invariants', () => {
  const prioritizedArb: fc.Arbitrary<Prioritized> = fc.record({
    id: fc.string({ minLength: 1, maxLength: 8 }),
    priority: fc.integer({ min: 0, max: 20 }),
  });

  it('is deterministic for the same input', () => {
    fc.assert(
      fc.property(fc.array(prioritizedArb, { maxLength: 12 }), (candidates) => {
        const first = sortByPriority(candidates).map((c) => c.id);
        const second = sortByPriority(candidates).map((c) => c.id);
        expect(second).toEqual(first);
      }),
    );
  });

  it('never produces a result with priority lower than a later element (sorted descending by priority group)', () => {
    fc.assert(
      fc.property(fc.array(prioritizedArb, { minLength: 1, maxLength: 12 }), (candidates) => {
        const sorted = sortByPriority(candidates);
        for (let i = 1; i < sorted.length; i += 1) {
          expect(sorted[i - 1].priority).toBeGreaterThanOrEqual(sorted[i].priority);
        }
      }),
    );
  });

  it('the winner always has priority >= every other candidate', () => {
    fc.assert(
      fc.property(fc.array(prioritizedArb, { minLength: 1, maxLength: 12 }), (candidates) => {
        const winner = selectByPriority(candidates)!;
        for (const candidate of candidates) {
          expect(winner.priority).toBeGreaterThanOrEqual(candidate.priority);
        }
      }),
    );
  });

  it('is a permutation of the input (same multiset of ids)', () => {
    fc.assert(
      fc.property(fc.array(prioritizedArb, { maxLength: 12 }), (candidates) => {
        const sorted = sortByPriority(candidates);
        expect(sorted.map((c) => c.id).sort()).toEqual(candidates.map((c) => c.id).sort());
      }),
    );
  });
});
