import { describe, expect, it } from 'vitest';

import { toPersistedRuntimeProgress, toRuntimeProgress } from './progress';

describe('progress mapping', () => {
  it('round-trips manual/externalOutcome/satisfied ids through the runtime shape', () => {
    const persisted = {
      manualCompletedStepIds: ['step-a'],
      externalOutcomeCompletedStepIds: ['step-b'],
      satisfiedRequirementIds: ['req-a'],
    };

    const runtime = toRuntimeProgress(persisted);
    expect(runtime.manualCompletedStepIds).toEqual(new Set(['step-a']));
    expect(runtime.externalOutcomeCompletedStepIds).toEqual(new Set(['step-b']));
    expect(runtime.satisfiedRequirementIds).toEqual(new Set(['req-a']));

    expect(toPersistedRuntimeProgress(runtime)).toEqual(persisted);
  });

  it('serializes deterministically regardless of Set insertion order', () => {
    const a = toPersistedRuntimeProgress({
      manualCompletedStepIds: new Set(['step-b', 'step-a']),
      externalOutcomeCompletedStepIds: new Set(),
      satisfiedRequirementIds: new Set(),
    });
    const b = toPersistedRuntimeProgress({
      manualCompletedStepIds: new Set(['step-a', 'step-b']),
      externalOutcomeCompletedStepIds: new Set(),
      satisfiedRequirementIds: new Set(),
    });

    expect(a).toEqual(b);
    expect(a.manualCompletedStepIds).toEqual(['step-a', 'step-b']);
  });
});
