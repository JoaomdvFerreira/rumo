'use client';

import styles from './RouteView.module.css';
import { QuestionPanel } from './QuestionPanel';
import { RequirementsPanel } from './RequirementsPanel';
import { StepCard } from './StepCard';
import type { DestinationResolution } from '../../../domain/engine/destination';
import type { Destination } from '../../../domain/model/routing';
import type { Requirement, RequirementGroup } from '../../../domain/model/requirement';
import type { FactQuestion } from '../questions';
import type { SourceDisclosureIndex } from '../sourceDisclosure';

export interface RouteViewProps {
  readonly rootDestination: Destination;
  readonly resolution: DestinationResolution;
  readonly pendingQuestion: FactQuestion | undefined;
  readonly requirementsById: ReadonlyMap<string, Requirement>;
  readonly requirementGroupsById: ReadonlyMap<string, RequirementGroup>;
  readonly satisfiedRequirementIds: ReadonlySet<string>;
  readonly sourceIndex: SourceDisclosureIndex;
  readonly onAnswerQuestion: (factKey: string, value: boolean) => void;
  readonly onConfirmRequirement: (requirementId: string, satisfied: boolean) => void;
  readonly onMarkManualComplete: (stepId: string) => void;
  readonly onConfirmExternalOutcome: (stepId: string) => void;
}

/**
 * The frozen MVP interaction hierarchy (WU007 "PRODUCT HIERARCHY -- FROZEN"),
 * rendered directly from WU003's `DestinationResolution` -- this component
 * never recomputes actionable/waiting/blocked/complete itself:
 *
 *   current situation -> pending question -> FAÇA ISTO AGORA -> parallel
 *   work -> waits/blockers -> completed objective
 *
 * A pending fact question always takes visual precedence over primary
 * action rendering, since the engine cannot resolve a correct Route until
 * the fact is known.
 */
export function RouteView({
  rootDestination,
  resolution,
  pendingQuestion,
  requirementsById,
  requirementGroupsById,
  satisfiedRequirementIds,
  sourceIndex,
  onAnswerQuestion,
  onConfirmRequirement,
  onMarkManualComplete,
  onConfirmExternalOutcome,
}: RouteViewProps) {
  return (
    <div className={styles.wrapper}>
      <header className={styles.situation}>
        <p className={styles.eyebrow}>Situação atual</p>
        <h2 className={styles.title}>{rootDestination.title}</h2>
        <p className={styles.description}>{rootDestination.description}</p>
      </header>

      <div aria-live="polite" className={styles.liveRegion}>
        {pendingQuestion && <QuestionPanel question={pendingQuestion} onAnswer={(value) => onAnswerQuestion(pendingQuestion.factKey, value)} />}

        {!pendingQuestion && resolution.state === 'unresolved' && (
          <p className={styles.unresolvedNotice} role="status">
            Ainda não temos informação suficiente para determinar o próximo passo.
          </p>
        )}

        {!pendingQuestion && resolution.state === 'complete' && (
          <p className={styles.completeNotice} role="status">
            Objetivo concluído. Já não há passos pendentes para esta situação.
          </p>
        )}

        {!pendingQuestion && resolution.primaryAction && (
          <StepCard
            pathStep={resolution.primaryAction}
            variant="primary"
            sourceIndex={sourceIndex}
            onMarkManualComplete={onMarkManualComplete}
            onConfirmExternalOutcome={onConfirmExternalOutcome}
          />
        )}

        {!pendingQuestion && resolution.parallelActions.length > 0 && (
          <section aria-labelledby="parallel-heading" className={styles.section}>
            <h3 id="parallel-heading" className={styles.sectionHeading}>
              Trabalho em paralelo
            </h3>
            <div className={styles.cardStack}>
              {resolution.parallelActions.map((pathStep) => (
                <StepCard
                  key={pathStep.step.id}
                  pathStep={pathStep}
                  variant="parallel"
                  sourceIndex={sourceIndex}
                  onMarkManualComplete={onMarkManualComplete}
                  onConfirmExternalOutcome={onConfirmExternalOutcome}
                />
              ))}
            </div>
          </section>
        )}

        {!pendingQuestion && resolution.state === 'waiting' && resolution.waits.length > 0 && (
          <section aria-labelledby="waiting-heading" className={styles.section}>
            <h3 id="waiting-heading" className={styles.sectionHeading}>
              A aguardar
            </h3>
            <div className={styles.cardStack}>
              {resolution.waits.map((pathStep) => (
                <StepCard
                  key={pathStep.step.id}
                  pathStep={pathStep}
                  variant="wait"
                  sourceIndex={sourceIndex}
                  onConfirmExternalOutcome={onConfirmExternalOutcome}
                />
              ))}
            </div>
          </section>
        )}

        {!pendingQuestion && resolution.state === 'actionable' && resolution.waits.length > 0 && (
          <section aria-labelledby="also-waiting-heading" className={styles.section}>
            <h3 id="also-waiting-heading" className={styles.sectionHeading}>
              Também a aguardar
            </h3>
            <div className={styles.cardStack}>
              {resolution.waits.map((pathStep) => (
                <StepCard
                  key={pathStep.step.id}
                  pathStep={pathStep}
                  variant="wait"
                  sourceIndex={sourceIndex}
                  onConfirmExternalOutcome={onConfirmExternalOutcome}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <RequirementsPanel
        blocked={resolution.blocked}
        requirementsById={requirementsById}
        requirementGroupsById={requirementGroupsById}
        satisfiedRequirementIds={satisfiedRequirementIds}
        sourceIndex={sourceIndex}
        onConfirmRequirement={onConfirmRequirement}
      />
    </div>
  );
}
