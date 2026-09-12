'use client';

import { useId, useState } from 'react';

import styles from './IntentEntry.module.css';
import { COMMON_SCENARIOS } from '../scenarios';

export interface IntentEntryProps {
  readonly onSubmit: (query: string) => void;
}

/**
 * Homepage / intent entry (WU007 "HOME / INTENT ENTRY"): concise product
 * proposition, a single search input, and the three frozen common
 * scenarios. Both the search form and a scenario button call the same
 * `onSubmit(query)` -- the scenario label is submitted verbatim as the
 * query so it resolves through the identical WU006 `matchIntents` path as
 * typed search, never a separate scenario -> destination table.
 */
export function IntentEntry({ onSubmit }: IntentEntryProps) {
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
          onSubmit(trimmed);
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
                onClick={() => onSubmit(scenario.label)}
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
