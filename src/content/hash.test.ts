import { describe, expect, it } from 'vitest';

import { computeContentHash } from './hash';
import type { ContentGraph } from './graph';

function emptyGraph(overrides: Partial<ContentGraph> = {}): ContentGraph {
  return {
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
    ...overrides,
  };
}

describe('computeContentHash', () => {
  it('is deterministic across repeated calls with the same content', () => {
    const graph = emptyGraph({
      lifeEvents: [
        {
          id: 'lifeEvent.a',
          title: 'A',
          description: 'A',
          destinationIds: ['destination.a'],
        },
      ],
    });
    expect(computeContentHash(graph)).toBe(computeContentHash(graph));
  });

  it('is independent of object key insertion order', () => {
    const graph = emptyGraph({
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'Pub',
          url: 'https://example.com',
          jurisdiction: 'PT',
          kind: 'evidence',
          freshnessRisk: 'low',
          supports: [],
        },
      ],
    });
    const reordered = {
      ...graph,
      sources: [
        {
          supports: [] as string[],
          freshnessRisk: 'low' as const,
          kind: 'evidence' as const,
          jurisdiction: 'PT',
          url: 'https://example.com',
          publisher: 'Pub',
          title: 'A',
          id: 'source.a',
        },
      ],
    };
    expect(computeContentHash(graph)).toBe(computeContentHash(reordered));
  });

  it('changes when a semantically meaningful value changes', () => {
    const base = emptyGraph({
      lifeEvents: [
        {
          id: 'lifeEvent.a',
          title: 'A',
          description: 'A',
          destinationIds: ['destination.a'],
        },
      ],
    });
    const changed = emptyGraph({
      lifeEvents: [
        {
          id: 'lifeEvent.a',
          title: 'A changed',
          description: 'A',
          destinationIds: ['destination.a'],
        },
      ],
    });
    expect(computeContentHash(base)).not.toBe(computeContentHash(changed));
  });

  it('is sensitive to array element order (declaration order is semantically meaningful)', () => {
    const first = emptyGraph({
      destinations: [
        {
          id: 'destination.a',
          title: 'A',
          description: 'A',
          routeIds: ['route.x', 'route.y'],
        },
      ],
    });
    const second = emptyGraph({
      destinations: [
        {
          id: 'destination.a',
          title: 'A',
          description: 'A',
          routeIds: ['route.y', 'route.x'],
        },
      ],
    });
    expect(computeContentHash(first)).not.toBe(computeContentHash(second));
  });
});
