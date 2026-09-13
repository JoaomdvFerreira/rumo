'use client';

import styles from './SingleResultConfirmation.module.css';
import type { IntentCandidate } from '../../../domain/model/intent';
import type { Destination } from '../../../domain/model/routing';

export interface SingleResultConfirmationProps {
  readonly query: string;
  readonly candidate: IntentCandidate;
  readonly destination: Destination;
  readonly onContinue: (candidate: IntentCandidate) => void;
  readonly onBack: () => void;
}

/**
 * F4 remediation (Project Overseer review of WU007/C007): typed search that
 * matches exactly one Destination must not immediately create a session --
 * the matched Destination is shown clearly with an explicit Continue/Start
 * CTA, and only that click proceeds. This is deliberately a distinct phase
 * from `CandidatePicker` (which handles genuine ambiguity between several
 * destinations): here there is only one match, but it still came from
 * free-text search rather than an already-explicit scenario choice, so one
 * more explicit confirmation is required before committing to it.
 */
export function SingleResultConfirmation({
  query,
  candidate,
  destination,
  onContinue,
  onBack,
}: SingleResultConfirmationProps) {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Encontrámos uma correspondência</h2>
      <p className={styles.body}>Para &ldquo;{query}&rdquo;, isto é o que encontrámos:</p>
      <div className={styles.match}>
        <span className={styles.matchTitle}>{destination.title}</span>
        <span className={styles.matchDescription}>{destination.description}</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.continueButton} onClick={() => onContinue(candidate)}>
          Continuar
        </button>
        <button type="button" className={styles.backButton} onClick={onBack}>
          Voltar à pesquisa
        </button>
      </div>
    </div>
  );
}
