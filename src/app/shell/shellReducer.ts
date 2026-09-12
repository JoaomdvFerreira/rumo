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
  | { readonly kind: 'candidates'; readonly query: string; readonly candidates: readonly IntentCandidate[] }
  | { readonly kind: 'active' };

export interface ShellState {
  readonly phase: ShellPhase;
  readonly session: ActiveSession | undefined;
  readonly restorationNotice: string | undefined;
}

export type ShellAction =
  | { readonly type: 'searchSubmitted'; readonly query: string; readonly candidates: readonly IntentCandidate[]; readonly now: string }
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
  };
}

export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case 'searchSubmitted': {
      if (action.candidates.length === 0) {
        return { ...state, phase: { kind: 'unsupported', query: action.query } };
      }
      if (action.candidates.length === 1) {
        return shellReducer(state, {
          type: 'candidateSelected',
          candidate: action.candidates[0],
          now: action.now,
        });
      }
      return {
        ...state,
        phase: { kind: 'candidates', query: action.query, candidates: action.candidates },
      };
    }

    case 'candidateSelected': {
      const session = createSessionFromCandidate(action.candidate, action.now);
      return { ...state, phase: { kind: 'active' }, session };
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
      return { phase: { kind: 'intentEntry' }, session: undefined, restorationNotice: undefined };
    }

    case 'sessionRestored': {
      // Hydration resolves asynchronously (WU005 hydration boundary) and can
      // land after the user has already started an interaction (e.g.
      // clicked a scenario before storage finished loading). Restoration
      // must never clobber interaction that has already happened -- once
      // the user has moved past the initial intent-entry phase, a late
      // restoration result is silently ignored rather than resetting them
      // back to a restored (or empty) session.
      if (state.phase.kind !== 'intentEntry') {
        return state;
      }
      return {
        phase: action.session ? { kind: 'active' } : { kind: 'intentEntry' },
        session: action.session,
        restorationNotice: action.notice,
      };
    }

    case 'noticeDismissed': {
      return { ...state, restorationNotice: undefined };
    }
  }
}
