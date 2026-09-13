'use client';

import styles from './UnsupportedResult.module.css';
import { COMMON_SCENARIOS } from '../scenarios';

export interface UnsupportedResultProps {
  readonly query: string;
  readonly onSelectScenario: (label: string) => void;
  readonly onBack: () => void;
}

/**
 * Zero-candidate outcome (WU007 "HOME / INTENT ENTRY": `matchIntents(...)
 * => []`). Never fabricates a route -- it states plainly that the case is
 * not currently supported and offers the frozen common scenarios instead.
 */
export function UnsupportedResult({ query, onSelectScenario, onBack }: UnsupportedResultProps) {
  return (
    <div className={styles.wrapper} role="status">
      <h2 className={styles.title}>Ainda não conseguimos ajudar com isso</h2>
      <p className={styles.body}>
        Não encontrámos um percurso correspondente a &ldquo;{query}&rdquo;. Por agora, o Rumo cobre
        estas situações:
      </p>
      <ul className={styles.scenarioList}>
        {COMMON_SCENARIOS.map((scenario) => (
          <li key={scenario.id}>
            <button
              type="button"
              className={styles.scenarioButton}
              onClick={() => onSelectScenario(scenario.label)}
            >
              {scenario.label}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.backButton} onClick={onBack}>
        Voltar à pesquisa
      </button>
    </div>
  );
}
