'use client';

import styles from './StepCard.module.css';
import { SourceDisclosure } from './SourceDisclosure';
import type { PathStep } from '../../../domain/engine/destination';
import type { SourceDisclosureIndex } from '../sourceDisclosure';

export type StepCardVariant = 'primary' | 'parallel' | 'wait';

export interface StepCardProps {
  readonly pathStep: PathStep;
  readonly variant: StepCardVariant;
  readonly sourceIndex: SourceDisclosureIndex;
  readonly onMarkManualComplete?: (stepId: string) => void;
  readonly onConfirmExternalOutcome?: (stepId: string) => void;
}

/**
 * Renders one Step as a task/wait card. Completion controls are gated by
 * the Step's own `completion` mode (WU007 "TASK COMPLETION"): a manual step
 * gets "Marcar como concluído", an externalOutcome step (including waits)
 * gets an explicit outcome-confirmation control; a subjourney step is never
 * given either, since its completion is derived only by the engine.
 */
export function StepCard({ pathStep, variant, sourceIndex, onMarkManualComplete, onConfirmExternalOutcome }: StepCardProps) {
  const { step } = pathStep;
  const disclosure = sourceIndex.forStep(step);

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      {variant === 'primary' && <p className={styles.eyebrow}>Faça isto agora</p>}
      {variant === 'parallel' && <p className={styles.eyebrow}>Também pode avançar</p>}
      {variant === 'wait' && <p className={styles.eyebrow}>A aguardar</p>}

      <h3 className={styles.title}>{step.title}</h3>
      <p className={styles.description}>{step.description}</p>

      {step.kind === 'wait' && step.estimatedDurationDays !== undefined && (
        <p className={styles.duration}>Duração máxima estimada: {step.estimatedDurationDays} dia(s) útil(eis)</p>
      )}

      <SourceDisclosure provider={disclosure.provider} channel={disclosure.channel} source={disclosure.source} />

      {step.kind === 'task' && step.completion === 'manual' && onMarkManualComplete && (
        <button type="button" className={styles.actionButton} onClick={() => onMarkManualComplete(step.id)}>
          Marcar como concluído
        </button>
      )}

      {step.completion === 'externalOutcome' && onConfirmExternalOutcome && (
        <button type="button" className={styles.actionButton} onClick={() => onConfirmExternalOutcome(step.id)}>
          {step.kind === 'wait' ? 'Confirmar que já aconteceu' : 'Confirmar resultado externo'}
        </button>
      )}
    </article>
  );
}
