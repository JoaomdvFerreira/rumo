import { describe, expect, it } from 'vitest';

import { checkContentGraph } from './validate';
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

describe('checkContentGraph', () => {
  it('reports no issues for an empty content graph', () => {
    expect(checkContentGraph(emptyGraph())).toEqual([]);
  });

  it('detects a duplicate id within a single collection', () => {
    const graph = emptyGraph({
      destinations: [
        { id: 'destination.a', title: 'A', description: 'A', routeIds: ['route.a'] },
        { id: 'destination.a', title: 'A dup', description: 'A dup', routeIds: ['route.a'] },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'duplicateId', entityKind: 'destination', id: 'destination.a' }),
    );
  });

  it('detects a dangling reference from a life event to an unknown destination', () => {
    const graph = emptyGraph({
      lifeEvents: [
        { id: 'lifeEvent.a', title: 'A', description: 'A', destinationIds: ['destination.missing'] },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'lifeEvent', id: 'lifeEvent.a' }),
    );
  });

  it('detects a dangling step reference from a route', () => {
    const graph = emptyGraph({
      routes: [{ id: 'route.a', title: 'A', priority: 0, stepIds: ['step.missing'], variantIds: [] }],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'route', id: 'route.a' }),
    );
  });

  it('detects a dangling subjourney destination reference from a step', () => {
    const graph = emptyGraph({
      steps: [
        {
          kind: 'subjourney',
          id: 'step.a',
          title: 'A',
          description: 'A',
          requirementIds: [],
          requirementGroupIds: [],
          dependsOnStepIds: [],
          priority: 0,
          destinationId: 'destination.missing',
          completion: 'subjourney',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'step', id: 'step.a' }),
    );
  });

  it('detects a dangling channel reference on a task step', () => {
    const graph = emptyGraph({
      providers: [
        {
          id: 'provider.a',
          name: 'A',
          jurisdiction: 'PT',
          sourceId: 'source.a',
          channels: [{ id: 'channel.real', type: 'online', label: 'Real' }],
        },
      ],
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'A',
          url: 'https://example.com/a',
          jurisdiction: 'PT',
          kind: 'evidence',
          freshnessRisk: 'low',
          supports: [],
        },
      ],
      sourceVerifications: [
        {
          sourceId: 'source.a',
          checkedAt: '2026-01-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'current',
        },
      ],
      steps: [
        {
          kind: 'task',
          id: 'step.a',
          title: 'A',
          description: 'A',
          requirementIds: [],
          requirementGroupIds: [],
          dependsOnStepIds: [],
          priority: 0,
          providerId: 'provider.a',
          channelId: 'channel.missing',
          completion: 'manual',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'step', id: 'step.a' }),
    );
  });

  it('detects an invalid condition with a blank fact key, including inside nested composition', () => {
    const graph = emptyGraph({
      routes: [
        {
          id: 'route.a',
          title: 'A',
          priority: 0,
          appliesWhen: {
            kind: 'allOf',
            conditions: [{ kind: 'factTruthy', fact: '   ' }],
          },
          stepIds: ['step.a'],
          variantIds: [],
        },
      ],
      steps: [
        {
          kind: 'task',
          id: 'step.a',
          title: 'A',
          description: 'A',
          requirementIds: [],
          requirementGroupIds: [],
          dependsOnStepIds: [],
          priority: 0,
          completion: 'manual',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'invalidCondition', entityKind: 'route', id: 'route.a' }),
    );
  });

  it('detects a source with no recorded verification', () => {
    const graph = emptyGraph({
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'A',
          url: 'https://example.com/a',
          jurisdiction: 'PT',
          kind: 'evidence',
          freshnessRisk: 'low',
          supports: [],
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'missingSourceVerification', entityKind: 'source', id: 'source.a' }),
    );
  });

  it('flags a high-freshness-risk source whose latest verification reports stale content', () => {
    const graph = emptyGraph({
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'A',
          url: 'https://example.com/a',
          jurisdiction: 'PT',
          kind: 'action',
          freshnessRisk: 'high',
          supports: [],
        },
      ],
      sourceVerifications: [
        {
          sourceId: 'source.a',
          checkedAt: '2026-01-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'current',
        },
        {
          sourceId: 'source.a',
          checkedAt: '2026-06-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'stale',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'staleHighRiskSource', entityKind: 'source', id: 'source.a' }),
    );
  });

  it('does not flag a high-freshness-risk source whose latest verification is current even if an older one was stale', () => {
    const graph = emptyGraph({
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'A',
          url: 'https://example.com/a',
          jurisdiction: 'PT',
          kind: 'action',
          freshnessRisk: 'high',
          supports: [],
        },
      ],
      sourceVerifications: [
        {
          sourceId: 'source.a',
          checkedAt: '2026-01-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'stale',
        },
        {
          sourceId: 'source.a',
          checkedAt: '2026-06-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'current',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).not.toContainEqual(expect.objectContaining({ kind: 'staleHighRiskSource' }));
  });

  it('does not treat link health as proof of content freshness (ok link health with stale content still flags)', () => {
    const graph = emptyGraph({
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'A',
          url: 'https://example.com/a',
          jurisdiction: 'PT',
          kind: 'action',
          freshnessRisk: 'high',
          supports: [],
        },
      ],
      sourceVerifications: [
        {
          sourceId: 'source.a',
          checkedAt: '2026-01-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'stale',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'staleHighRiskSource' }));
  });

  it('detects a dangling source reference in a provider sourceId', () => {
    const graph = emptyGraph({
      providers: [
        {
          id: 'provider.a',
          name: 'A',
          jurisdiction: 'PT',
          sourceId: 'source.missing',
          channels: [{ id: 'channel.a', type: 'online', label: 'A' }],
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'provider', id: 'provider.a' }),
    );
  });

  it('detects a dangling source reference in a decision reference sourceIds', () => {
    const graph = emptyGraph({
      decisionReferences: [{ id: 'decision.a', sourceIds: ['source.missing'], summary: 'A' }],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'decisionReference', id: 'decision.a' }),
    );
  });

  it('detects a dangling entity reference in a source "supports" array', () => {
    const graph = emptyGraph({
      sources: [
        {
          id: 'source.a',
          title: 'A',
          publisher: 'A',
          url: 'https://example.com/a',
          jurisdiction: 'PT',
          kind: 'evidence',
          freshnessRisk: 'low',
          supports: ['step.missing'],
        },
      ],
      sourceVerifications: [
        {
          sourceId: 'source.a',
          checkedAt: '2026-01-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'current',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'source', id: 'source.a' }),
    );
  });

  it('detects a SourceVerification referencing an unknown source', () => {
    const graph = emptyGraph({
      sourceVerifications: [
        {
          sourceId: 'source.missing',
          checkedAt: '2026-01-01T00:00:00.000Z',
          checkedBy: 'test',
          linkHealth: 'ok',
          contentFreshness: 'current',
        },
      ],
    });
    const issues = checkContentGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'danglingReference', entityKind: 'sourceVerification', id: 'source.missing' }),
    );
  });
});
