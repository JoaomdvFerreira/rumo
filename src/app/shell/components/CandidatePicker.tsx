'use client';

import styles from './CandidatePicker.module.css';
import type { IntentCandidate } from '../../../domain/model/intent';
import type { Destination } from '../../../domain/model/routing';

export interface CandidatePickerProps {
  readonly query: string;
  readonly candidates: readonly IntentCandidate[];
  readonly destinationsById: ReadonlyMap<string, Destination>;
  readonly onSelect: (candidate: IntentCandidate) => void;
  readonly onBack: () => void;
}

/**
 * Multiple-candidate outcome (WU007: "DO NOT silently select candidate[0].
 * The user must choose explicitly between ambiguous destinations."). Every
 * candidate is rendered as its own explicit choice; there is no default
 * selection and no auto-advance.
 */
export function CandidatePicker({ query, candidates, destinationsById, onSelect, onBack }: CandidatePickerProps) {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Encontrámos mais do que uma opção</h2>
      <p className={styles.body}>
        Para &ldquo;{query}&rdquo;, escolha o percurso que corresponde à sua situação:
      </p>
      <ul className={styles.candidateList}>
        {candidates.map((candidate) => {
          const destination = destinationsById.get(candidate.destinationId);
          if (!destination) return null;
          return (
            <li key={candidate.destinationId}>
              <button
                type="button"
                className={styles.candidateButton}
                onClick={() => onSelect(candidate)}
              >
                <span className={styles.candidateTitle}>{destination.title}</span>
                <span className={styles.candidateDescription}>{destination.description}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className={styles.backButton} onClick={onBack}>
        Voltar à pesquisa
      </button>
    </div>
  );
}
