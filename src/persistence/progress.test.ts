import { describe, expect, it } from 'vitest';

import { toPersistedRuntimeProgress, toRuntimeProgress } from './progress';
import type { RevalidationContentIndex } from './revalidate';

const content: RevalidationContentIndex = {
  destinationIds: new Set(['dest-root']),
  stepFingerprints: new Map([
    ['step-a', 'fp-a'],
    ['step-b', 'fp-b'],
  ]),
  requirementFingerprints: new Map([['req-a', 'fp-r']]),
  reachableStepIdsByDestination: new Map([['dest-root', new Set(['step-a', 'step-b'])]]),
  reachableRequirementIdsByDestination: new Map([['dest-root', new Set(['req-a'])]]),
};

describe('progress mapping', () => {
  it('round-trips fingerprinted persistence through the WU003 runtime shape', () => {
    const persisted = {
      manualCompletedStepIds: [{ id: 'step-a', fingerprint: 'fp-a' }],
      externalOutcomeCompletedStepIds: [{ id: 'step-b', fingerprint: 'fp-b' }],
      satisfiedRequirementIds: [{ id: 'req-a', fingerprint: 'fp-r' }],
    };

    const runtime = toRuntimeProgress(persisted);
    expect(runtime.manualCompletedStepIds).toEqual(new Set(['step-a']));
    expect(runtime.externalOutcomeCompletedStepIds).toEqual(new Set(['step-b']));
    expect(runtime.satisfiedRequirementIds).toEqual(new Set(['req-a']));
    expect(toPersistedRuntimeProgress(runtime, 'dest-root', content)).toEqual(persisted);
  });

  it('serializes deterministically and excludes progress not reachable from the root', () => {
    const persisted = toPersistedRuntimeProgress(
      {
        manualCompletedStepIds: new Set(['unreachable', 'step-b', 'step-a']),
        externalOutcomeCompletedStepIds: new Set(),
        satisfiedRequirementIds: new Set(),
      },
      'dest-root',
      content,
    );

    expect(persisted.manualCompletedStepIds).toEqual([
      { id: 'step-a', fingerprint: 'fp-a' },
      { id: 'step-b', fingerprint: 'fp-b' },
    ]);
  });
});
