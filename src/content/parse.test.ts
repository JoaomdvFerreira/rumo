import { describe, expect, it } from 'vitest';

import { parseContentGraph } from './parse';

describe('parseContentGraph', () => {
  it('accepts a minimal, empty content graph', () => {
    const result = parseContentGraph({
      lifeEvents: [],
      destinations: [],
      routes: [],
      routeVariants: [],
      steps: [],
      requirements: [],
      requirementGroups: [],
      providers: [],
      sources: [],
      sourceVerifications: [],
      decisionReferences: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a candidate missing a required collection', () => {
    const result = parseContentGraph({
      lifeEvents: [],
      destinations: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a candidate with an unexpected top-level key', () => {
    const result = parseContentGraph({
      lifeEvents: [],
      destinations: [],
      routes: [],
      routeVariants: [],
      steps: [],
      requirements: [],
      requirementGroups: [],
      providers: [],
      sources: [],
      sourceVerifications: [],
      decisionReferences: [],
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a candidate with a structurally invalid entity', () => {
    const result = parseContentGraph({
      lifeEvents: [{ id: 'lifeEvent.a', title: 'A', description: 'A', destinationIds: [] }],
      destinations: [],
      routes: [],
      routeVariants: [],
      steps: [],
      requirements: [],
      requirementGroups: [],
      providers: [],
      sources: [],
      sourceVerifications: [],
      decisionReferences: [],
    });
    expect(result.success).toBe(false);
  });
});
