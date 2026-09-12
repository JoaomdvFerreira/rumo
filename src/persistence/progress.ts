import type { PersistedRuntimeProgress } from './schema';
import type { RuntimeProgress } from '../domain/engine/runtime';

/**
 * The only conversion between the persisted (array-based, JSON-safe)
 * progress representation and the engine's `RuntimeProgress` (set-based).
 * There is exactly one progress model in the system (WU003's); this module
 * never introduces a second one, only (de)serializes it.
 */
export function toRuntimeProgress(persisted: PersistedRuntimeProgress): RuntimeProgress {
  return {
    manualCompletedStepIds: new Set(persisted.manualCompletedStepIds),
    externalOutcomeCompletedStepIds: new Set(persisted.externalOutcomeCompletedStepIds),
    satisfiedRequirementIds: new Set(persisted.satisfiedRequirementIds),
  };
}

export function toPersistedRuntimeProgress(progress: RuntimeProgress): PersistedRuntimeProgress {
  return {
    manualCompletedStepIds: [...progress.manualCompletedStepIds].sort(),
    externalOutcomeCompletedStepIds: [...progress.externalOutcomeCompletedStepIds].sort(),
    satisfiedRequirementIds: [...progress.satisfiedRequirementIds].sort(),
  };
}
