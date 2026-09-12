'use client';

import { useMemo } from 'react';

import styles from './AppShell.module.css';
import { CandidatePicker } from './components/CandidatePicker';
import { IntentEntry } from './components/IntentEntry';
import { RouteView } from './components/RouteView';
import { SingleResultConfirmation } from './components/SingleResultConfirmation';
import { UnsupportedResult } from './components/UnsupportedResult';
import { nextUnansweredQuestion } from './questions';
import { SourceDisclosureIndex } from './sourceDisclosure';
import { nowIso, useAppShell } from './useAppShell';
import type { AppBootstrap } from './bootstrap';
import { matchIntents } from '../../domain/engine/intent';

export interface AppShellProps {
  readonly bootstrap: AppBootstrap;
}

/**
 * Thin integration/presentation layer (WU007 "ARCHITECTURE BOUNDARIES"):
 * this component owns no business/routing rules of its own. It only calls
 * WU006's `matchIntents` for search, reads WU003's `DestinationResolution`
 * from `useAppShell`, and renders the frozen interaction hierarchy.
 */
export function AppShell({ bootstrap }: AppShellProps) {
  const { state, dispatch, resolution, persistenceAvailable, hydrated } = useAppShell(bootstrap);

  const destinationsById = useMemo(
    () => new Map(bootstrap.destinations.map((destination) => [destination.id, destination])),
    [bootstrap],
  );
  const requirementsById = useMemo(
    () => new Map(bootstrap.requirements.map((requirement) => [requirement.id, requirement])),
    [bootstrap],
  );
  const requirementGroupsById = useMemo(
    () => new Map(bootstrap.requirementGroups.map((group) => [group.id, group])),
    [bootstrap],
  );
  const sourceIndex = useMemo(() => new SourceDisclosureIndex(bootstrap), [bootstrap]);

  const rootDestination = state.session ? destinationsById.get(state.session.rootDestinationId) : undefined;
  const pendingQuestion =
    state.session && rootDestination ? nextUnansweredQuestion(state.session.rootDestinationId, state.session.facts) : undefined;

  function handleSearch(query: string, source: 'search' | 'scenario') {
    const candidates = matchIntents(query, bootstrap.intentCatalog);
    dispatch({ type: 'searchSubmitted', query, candidates, source, now: nowIso() });
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Rumo</p>
          <h1 className={styles.title}>Rumo</h1>
          <p className={styles.tagline}>Não precisa de saber por onde começar.</p>
        </div>

        {hydrated && !persistenceAvailable && (
          <p className={styles.persistenceDisclosure} role="status">
            O seu progresso não será guardado neste dispositivo (armazenamento indisponível). Pode continuar a
            usar o Rumo normalmente nesta visita.
          </p>
        )}

        {state.restorationNotice && (
          <div className={styles.notice} role="status">
            <span>{state.restorationNotice}</span>
            <button
              type="button"
              className={styles.noticeDismiss}
              onClick={() => dispatch({ type: 'noticeDismissed' })}
              aria-label="Dispensar aviso"
            >
              ×
            </button>
          </div>
        )}

        {state.phase.kind === 'intentEntry' && (
          <IntentEntry
            onSearch={(query) => handleSearch(query, 'search')}
            onSelectScenario={(label) => handleSearch(label, 'scenario')}
          />
        )}

        {state.phase.kind === 'unsupported' && (
          <UnsupportedResult
            query={state.phase.query}
            onSelectScenario={(label) => handleSearch(label, 'scenario')}
            onBack={() => dispatch({ type: 'reset' })}
          />
        )}

        {state.phase.kind === 'singleResult' &&
          (() => {
            const destination = destinationsById.get(state.phase.candidate.destinationId);
            if (!destination) return null;
            return (
              <SingleResultConfirmation
                query={state.phase.query}
                candidate={state.phase.candidate}
                destination={destination}
                onContinue={(candidate) => dispatch({ type: 'candidateSelected', candidate, now: nowIso() })}
                onBack={() => dispatch({ type: 'reset' })}
              />
            );
          })()}

        {state.phase.kind === 'candidates' && (
          <CandidatePicker
            query={state.phase.query}
            candidates={state.phase.candidates}
            destinationsById={destinationsById}
            onSelect={(candidate) => dispatch({ type: 'candidateSelected', candidate, now: nowIso() })}
            onBack={() => dispatch({ type: 'reset' })}
          />
        )}

        {state.phase.kind === 'active' && state.session && rootDestination && resolution && (
          <>
            <RouteView
              rootDestination={rootDestination}
              resolution={resolution}
              pendingQuestion={pendingQuestion}
              requirementsById={requirementsById}
              requirementGroupsById={requirementGroupsById}
              satisfiedRequirementIds={state.session.progress.satisfiedRequirementIds}
              sourceIndex={sourceIndex}
              onAnswerQuestion={(factKey, value) => dispatch({ type: 'factAnswered', factKey, value, now: nowIso() })}
              onConfirmRequirement={(requirementId, satisfied) =>
                dispatch({ type: 'requirementConfirmed', requirementId, satisfied, now: nowIso() })
              }
              onMarkManualComplete={(stepId) => dispatch({ type: 'manualTaskCompleted', stepId, now: nowIso() })}
              onConfirmExternalOutcome={(stepId) => dispatch({ type: 'externalOutcomeConfirmed', stepId, now: nowIso() })}
            />
            <div className={styles.resetRow}>
              <button type="button" className={styles.resetButton} onClick={() => dispatch({ type: 'reset' })}>
                Começar de novo
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
