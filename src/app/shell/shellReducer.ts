import type { IntentCandidate } from '../../domain/model/intent';
import type { FactSet } from '../../domain/model/fact';
import {
  createSessionFromCandidate,
  withExternalOutcomeCompleted,
  withFact,
  withManualStepCompleted,
  withRequirementSatisfied,
  type ActiveSession,
} from './sessionState';

/**
 * UI phase: the transient presentation state React owns directly (per the
 * WU007 boundary: "React local state/useReducer is acceptable for transient
 * presentation state"). It never duplicates the WU003 progress model --
 * `session` is the only source of routing-relevant truth, `phase` only
 * decides which screen renders over it.
 */
export type ShellPhase =
  | { readonly kind: 'intentEntry' }
  | { readonly kind: 'unsupported'; readonly query: string }
  | { readonly kind: 'singleResult'; readonly query: string; readonly candidate: IntentCandidate }
  | { readonly kind: 'candidates'; readonly query: string; readonly candidates: readonly IntentCandidate[] }
  | { readonly kind: 'active' };

export interface ShellState {
  readonly phase: ShellPhase;
  readonly session: ActiveSession | undefined;
  readonly restorationNotice: string | undefined;
  /**
   * F6 remediation (Project Overseer review of WU007/C007): transient
   * hydration-race guard, never persisted (WU005 has no field for it and
   * none should be added). `sessionRestored`'s prior guard checked only
   * `state.phase.kind === 'intentEntry'`, but an explicit `reset` also
   * lands on `intentEntry` -- so this sequence could restore stale data:
   *   persisted session A -> hydration still loading -> user starts an
   *   interaction -> user resets -> phase is intentEntry again -> late
   *   hydration resolves -> sessionRestored(A) -> stale A reactivated.
   * `hasUserInteracted` tracks *whether the user has meaningfully acted
   * during this mount at all*, independent of which phase that interaction
   * currently leaves them on. Once true, it is never cleared -- not even by
   * `reset`, which is itself one of the interactions that must permanently
   * close the late-restoration window -- so a late `sessionRestored` is
   * ignored for the rest of this mount's lifetime once the user has acted.
   */
  readonly hasUserInteracted: boolean;
}

export type ShellAction =
  | {
      readonly type: 'searchSubmitted';
      readonly query: string;
      readonly candidates: readonly IntentCandidate[];
      /**
       * F4 remediation (Project Overseer review of WU007/C007): a common-
       * scenario button click is already an explicit user choice (the WU007
       * spec: "Common-scenario selection ... must use the same canonical
       * WU006 intent path"; scenario buttons submit their exact label
       * through the same `matchIntents` call as typed search), so a single
       * match may continue directly. Typed free-text search must not: a
       * single match there needs its own explicit Continue confirmation
       * before a session is created.
       */
      readonly source: 'search' | 'scenario';
      readonly now: string;
    }
  | { readonly type: 'candidateSelected'; readonly candidate: IntentCandidate; readonly now: string }
  | { readonly type: 'factAnswered'; readonly factKey: string; readonly value: FactSet[string]; readonly now: string }
  | { readonly type: 'requirementConfirmed'; readonly requirementId: string; readonly satisfied: boolean; readonly now: string }
  | { readonly type: 'manualTaskCompleted'; readonly stepId: string; readonly now: string }
  | { readonly type: 'externalOutcomeConfirmed'; readonly stepId: string; readonly now: string }
  | { readonly type: 'reset' }
  | { readonly type: 'sessionRestored'; readonly session: ActiveSession | undefined; readonly notice: string | undefined }
  | { readonly type: 'noticeDismissed' };

export function initialShellState(restoredSession: ActiveSession | undefined, notice: string | undefined): ShellState {
  return {
    phase: restoredSession ? { kind: 'active' } : { kind: 'intentEntry' },
    session: restoredSession,
    restorationNotice: notice,
    hasUserInteracted: false,
  };
}

export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case 'searchSubmitted': {
      // F6 remediation: a search submission -- typed or a common-scenario
      // click, which submits through this same action (F4) -- is one of
      // the interactions that must permanently close the late-restoration
      // window, regardless of which phase it resolves to below.
      const interacted = { ...state, hasUserInteracted: true };

      if (action.candidates.length === 0) {
        return { ...interacted, phase: { kind: 'unsupported', query: action.query } };
      }
      if (action.candidates.length === 1) {
        if (action.source === 'scenario') {
          return shellReducer(interacted, {
            type: 'candidateSelected',
            candidate: action.candidates[0],
            now: action.now,
          });
        }
        // F4 remediation: typed search never auto-creates a session, even
        // with exactly one match -- the matched Destination is shown with
        // an explicit Continue/Start CTA, and only that click proceeds.
        return {
          ...interacted,
          phase: { kind: 'singleResult', query: action.query, candidate: action.candidates[0] },
        };
      }
      return {
        ...interacted,
        phase: { kind: 'candidates', query: action.query, candidates: action.candidates },
      };
    }

    case 'candidateSelected': {
      const session = createSessionFromCandidate(action.candidate, action.now);
      return { ...state, phase: { kind: 'active' }, session, hasUserInteracted: true };
    }

    case 'factAnswered': {
      if (!state.session) return state;
      return {
        ...state,
        session: withFact(state.session, action.factKey, action.value, action.now),
      };
    }

    case 'requirementConfirmed': {
      if (!state.session) return state;
      return {
        ...state,
        session: withRequirementSatisfied(state.session, action.requirementId, action.satisfied, action.now),
      };
    }

    case 'manualTaskCompleted': {
      if (!state.session) return state;
      return {
        ...state,
        session: withManualStepCompleted(state.session, action.stepId, action.now),
      };
    }

    case 'externalOutcomeConfirmed': {
      if (!state.session) return state;
      return {
        ...state,
        session: withExternalOutcomeCompleted(state.session, action.stepId, action.now),
      };
    }

    case 'reset': {
      // F6 remediation: reset/back-to-home is itself a required
      // interaction that must permanently close the late-restoration
      // window -- it lands back on `intentEntry`, so the guard below must
      // not mistake that for the untouched initial visit and let a late
      // hydration result reactivate whatever was persisted before the
      // reset.
      return { phase: { kind: 'intentEntry' }, session: undefined, restorationNotice: undefined, hasUserInteracted: true };
    }

    case 'sessionRestored': {
      // F6 remediation (Project Overseer review of WU007/C007): the prior
      // guard here checked only `state.phase.kind !== 'intentEntry'`, which
      // is not equivalent to "the user has not yet interacted" -- an
      // explicit reset also lands on `intentEntry`, so a persisted-session-A
      // -> interaction -> reset -> late-hydration(A) sequence could
      // reactivate stale session A after the user had explicitly reset.
      // `hasUserInteracted` tracks the real invariant: hydration may only
      // restore persisted state while this mount remains genuinely
      // untouched, regardless of which phase that untouched state happens
      // to be. Once true, it can never flip back via this action -- a
      // second late-arriving restoration result is likewise ignored.
      if (state.hasUserInteracted) {
        return state;
      }
      return {
        phase: action.session ? { kind: 'active' } : { kind: 'intentEntry' },
        session: action.session,
        restorationNotice: action.notice,
        hasUserInteracted: state.hasUserInteracted,
      };
    }

    case 'noticeDismissed': {
      return { ...state, restorationNotice: undefined };
    }
  }
}
