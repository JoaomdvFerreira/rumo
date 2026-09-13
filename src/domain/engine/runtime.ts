import type { FactSet } from '../model/fact';

/**
 * Minimum pure runtime progress contract WU003 needs to derive step state.
 * Persistence (how this is stored/loaded) belongs to WU005; the engine only
 * reads a plain, already-resolved snapshot of completion state.
 *
 * `manualCompletedStepIds` and `externalOutcomeCompletedStepIds` are kept
 * separate rather than a single "completedStepIds" set, because a step's
 * completion mode (see `Step.completion`) restricts which channel is allowed
 * to mark it complete: a manual-completion step is never completed by an
 * external-outcome signal and vice versa. Neither set is ever consulted for
 * a `subjourney` step -- its completion is derived only from its target
 * Destination's resolved state (see engine/destination.ts), never stored as
 * a runtime signal here.
 *
 * `satisfiedRequirementIds` is the minimum runtime signal for Requirement
 * fulfilment: an applicable Requirement is satisfied only when its id is a
 * member of this set (see engine/requirement.ts). This does not change the
 * canonical Requirement schema -- it is purely a runtime progress input.
 */
export interface RuntimeProgress {
  readonly manualCompletedStepIds: ReadonlySet<string>;
  readonly externalOutcomeCompletedStepIds: ReadonlySet<string>;
  readonly satisfiedRequirementIds: ReadonlySet<string>;
}

/**
 * Everything the engine needs to resolve a Destination: the runtime facts
 * to evaluate Conditions against, and the caller's completion progress.
 */
export interface RoutingContext {
  readonly facts: FactSet;
  readonly progress: RuntimeProgress;
}

export function isStepCompleted(progress: RuntimeProgress, stepId: string): boolean {
  return progress.manualCompletedStepIds.has(stepId) || progress.externalOutcomeCompletedStepIds.has(stepId);
}
