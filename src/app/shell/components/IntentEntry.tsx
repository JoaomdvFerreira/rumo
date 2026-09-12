'use client';

import { useId, useState } from 'react';

import styles from './IntentEntry.module.css';
import { COMMON_SCENARIOS } from '../scenarios';

export interface IntentEntryProps {
  readonly onSearch: (query: string) => void;
  readonly onSelectScenario: (label: string) => void;
}

/**
 * Homepage / intent entry (WU007 "HOME / INTENT ENTRY"): concise product
 * proposition, a single search input, and the three frozen common
 * scenarios. Both the search form and a scenario button submit through the
 * identical WU006 `matchIntents` path (the scenario label is submitted
 * verbatim as the query), never a separate scenario -> destination table.
 *
 * `onSearch` and `onSelectScenario` are kept as two distinct callbacks (F4
 * remediation, Project Overseer review of WU007/C007) purely to carry which
 * UX applies on a single-candidate match: a scenario click is already an
 * explicit user choice and may continue directly, while typed free-text
 * search must show an explicit Continue confirmation first. Both still run
 * through the same matching call in the parent -- only the outcome-handling
 * differs.
 */
export function IntentEntry({ onSearch, onSelectScenario }: IntentEntryProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();

  return (
    <div className={styles.entry}>
      <form
        className={styles.searchForm}
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          if (trimmed.length === 0) return;
          onSearch(trimmed);
        }}
      >
        <label className={styles.searchLabel} htmlFor={inputId}>
          O que precisa de resolver?
        </label>
        <div className={styles.searchRow}>
          <input
            id={inputId}
            name="query"
            type="text"
            className={styles.searchInput}
            placeholder="Ex.: mudar de casa, ligar a eletricidade..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <button type="submit" className={styles.searchButton}>
            Procurar
          </button>
        </div>
      </form>

      <div className={styles.scenarios}>
        <h2 className={styles.scenariosTitle}>Situações comuns</h2>
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
      </div>
    </div>
  );
}
