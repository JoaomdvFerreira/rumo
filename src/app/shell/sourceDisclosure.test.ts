import { describe, expect, it } from 'vitest';

import { SourceDisclosureIndex, officialSourceUrl } from './sourceDisclosure';
import type { AppBootstrap } from './bootstrap';
import type { TaskStep } from '../../domain/model/step';
import type { Requirement } from '../../domain/model/requirement';

function minimalBootstrap(overrides: Partial<AppBootstrap>): AppBootstrap {
  return {
    contentVersion: 'test-content-version',
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
    intentCatalog: [],
    revalidationContentIndex: {
      destinationIds: [],
      stepFingerprints: [],
      requirementFingerprints: [],
      reachableStepIdsByDestination: [],
      reachableRequirementIdsByDestination: [],
    },
    ...overrides,
  };
}

describe('officialSourceUrl (F3: link official source URLs)', () => {
  it('uses the canonical SourceDefinition.url when there is no verification finalUrl', () => {
    const url = officialSourceUrl({
      source: {
        id: 'source.a',
        title: 'A',
        publisher: 'Publisher',
        url: 'https://example.gov.pt/a',
        jurisdiction: 'PT',
        kind: 'evidence',
        freshnessRisk: 'medium',
        supports: [],
      },
      latestVerification: undefined,
    });
    expect(url).toBe('https://example.gov.pt/a');
  });

  it('prefers the latest verification finalUrl when present', () => {
    const url = officialSourceUrl({
      source: {
        id: 'source.a',
        title: 'A',
        publisher: 'Publisher',
        url: 'https://example.gov.pt/a',
        jurisdiction: 'PT',
        kind: 'evidence',
        freshnessRisk: 'medium',
        supports: [],
      },
      latestVerification: {
        sourceId: 'source.a',
        checkedAt: '2026-01-01T00:00:00.000Z',
        checkedBy: 'content-team',
        linkHealth: 'ok',
        contentFreshness: 'current',
        finalUrl: 'https://example.gov.pt/a-redirected',
      },
    });
    expect(url).toBe('https://example.gov.pt/a-redirected');
  });

  it('never synthesizes a URL from an unrelated field', () => {
    const url = officialSourceUrl({
      source: {
        id: 'source.a',
        title: 'A',
        publisher: 'Publisher',
        url: 'https://example.gov.pt/a',
        jurisdiction: 'PT',
        kind: 'evidence',
        freshnessRisk: 'medium',
        supports: [],
      },
      latestVerification: {
        sourceId: 'source.a',
        checkedAt: '2026-01-01T00:00:00.000Z',
        checkedBy: 'content-team',
        linkHealth: 'ok',
        contentFreshness: 'current',
      },
    });
    expect(url).toBe('https://example.gov.pt/a');
  });
});

describe('SourceDisclosureIndex (F3: link official source URLs)', () => {
  const providerSource = {
    id: 'source.provider-source',
    title: 'Provider Source',
    publisher: 'Publisher',
    url: 'https://example.gov.pt/provider-source',
    jurisdiction: 'PT',
    kind: 'action' as const,
    freshnessRisk: 'medium' as const,
    supports: [],
  };

  const decisionSource = {
    id: 'source.decision-source',
    title: 'Decision Source',
    publisher: 'Publisher',
    url: 'https://example.gov.pt/decision-source',
    jurisdiction: 'PT',
    kind: 'evidence' as const,
    freshnessRisk: 'medium' as const,
    supports: [],
  };

  it('resolves a Step -> Provider/Channel -> Provider.sourceId -> SourceDefinition relationship', () => {
    const step: TaskStep = {
      kind: 'task',
      id: 'step.with-provider',
      title: 'Do the thing',
      description: 'Description',
      requirementIds: [],
      requirementGroupIds: [],
      dependsOnStepIds: [],
      priority: 0,
      providerId: 'provider.x',
      channelId: 'channel.x-online',
      completion: 'manual',
    };
    const bootstrap = minimalBootstrap({
      providers: [
        {
          id: 'provider.x',
          name: 'Provider X',
          jurisdiction: 'PT',
          sourceId: providerSource.id,
          channels: [{ id: 'channel.x-online', type: 'online', label: 'Online channel', url: 'https://example.gov.pt/channel' }],
        },
      ],
      sources: [providerSource],
    });

    const index = new SourceDisclosureIndex(bootstrap);
    const disclosure = index.forStep(step);

    expect(disclosure.provider?.id).toBe('provider.x');
    expect(disclosure.channel?.id).toBe('channel.x-online');
    expect(disclosure.source?.source.id).toBe(providerSource.id);
    expect(officialSourceUrl(disclosure.source!)).toBe(providerSource.url);
  });

  it('resolves a Requirement -> DecisionReference -> Source relationship with no Provider/Channel involved', () => {
    const requirement: Requirement = {
      id: 'requirement.needs-decision',
      title: 'Requirement title',
      description: 'Requirement description',
      decisionReferenceIds: ['decision.one'],
    };
    const bootstrap = minimalBootstrap({
      decisionReferences: [{ id: 'decision.one', sourceIds: [decisionSource.id], summary: 'Summary' }],
      sources: [decisionSource],
    });

    const index = new SourceDisclosureIndex(bootstrap);
    const disclosure = index.forRequirement(requirement);

    expect(disclosure.sources).toHaveLength(1);
    expect(disclosure.sources[0].source.id).toBe(decisionSource.id);
    expect(officialSourceUrl(disclosure.sources[0])).toBe(decisionSource.url);
  });

  it('produces no source/provider/channel disclosure when the graph declares no relationship', () => {
    const step: TaskStep = {
      kind: 'task',
      id: 'step.no-provider',
      title: 'Do the thing',
      description: 'Description',
      requirementIds: [],
      requirementGroupIds: [],
      dependsOnStepIds: [],
      priority: 0,
      completion: 'manual',
    };
    const requirement: Requirement = {
      id: 'requirement.no-decision',
      title: 'Requirement title',
      description: 'Requirement description',
      decisionReferenceIds: [],
    };
    const bootstrap = minimalBootstrap({});

    const index = new SourceDisclosureIndex(bootstrap);
    const stepDisclosure = index.forStep(step);
    const requirementDisclosure = index.forRequirement(requirement);

    expect(stepDisclosure.provider).toBeUndefined();
    expect(stepDisclosure.channel).toBeUndefined();
    expect(stepDisclosure.source).toBeUndefined();
    expect(requirementDisclosure.sources).toEqual([]);
  });
});
