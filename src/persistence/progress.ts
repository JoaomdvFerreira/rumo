import type { PersistedRuntimeProgress } from './schema';
import type { RevalidationContentIndex } from './revalidate';
import type { RuntimeProgress } from '../domain/engine/runtime';

/**
 * The only conversion between the persisted (array-based, JSON-safe)
 * progress representation and the engine's `RuntimeProgress` (set-based).
 * There is exactly one progress model in the system (WU003's); this module
 * never introduces a second one, only (de)serializes it.
 */
export function toRuntimeProgress(persisted: PersistedRuntimeProgress): RuntimeProgress {
  return {
    manualCompletedStepIds: new Set(persisted.manualCompletedStepIds.map((entry) => entry.id)),
    externalOutcomeCompletedStepIds: new Set(persisted.externalOutcomeCompletedStepIds.map((entry) => entry.id)),
    satisfiedRequirementIds: new Set(persisted.satisfiedRequirementIds.map((entry) => entry.id)),
  };
}

export function toPersistedRuntimeProgress(
  progress: RuntimeProgress,
  rootDestinationId: string,
  content: RevalidationContentIndex,
): PersistedRuntimeProgress {
  const reachableSteps = content.reachableStepIdsByDestination.get(rootDestinationId) ?? new Set<string>();
  const reachableRequirements =
    content.reachableRequirementIdsByDestination.get(rootDestinationId) ?? new Set<string>();
  const stepEntries = (ids: ReadonlySet<string>) =>
    [...ids]
      .filter((id) => reachableSteps.has(id) && content.stepFingerprints.has(id))
      .sort()
      .map((id) => ({ id, fingerprint: content.stepFingerprints.get(id) as string }));
  const requirementEntries = (ids: ReadonlySet<string>) =>
    [...ids]
      .filter((id) => reachableRequirements.has(id) && content.requirementFingerprints.has(id))
      .sort()
      .map((id) => ({ id, fingerprint: content.requirementFingerprints.get(id) as string }));

  return {
    manualCompletedStepIds: stepEntries(progress.manualCompletedStepIds),
    externalOutcomeCompletedStepIds: stepEntries(progress.externalOutcomeCompletedStepIds),
    satisfiedRequirementIds: requirementEntries(progress.satisfiedRequirementIds),
  };
}
