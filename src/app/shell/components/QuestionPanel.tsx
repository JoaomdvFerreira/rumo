'use client';

import styles from './QuestionPanel.module.css';
import type { FactQuestion } from '../questions';

export interface QuestionPanelProps {
  readonly question: FactQuestion;
  readonly onAnswer: (value: boolean) => void;
}

/**
 * Explicit, bounded, declarative yes/no fact question (WU007 "FACT
 * QUESTIONS"). Renders as a fieldset/legend group per the accessibility
 * baseline; never pre-selects an answer and never silently assumes a
 * default before the user responds.
 */
export function QuestionPanel({ question, onAnswer }: QuestionPanelProps) {
  return (
    <fieldset className={styles.panel}>
      <legend className={styles.legend}>{question.prompt}</legend>
      <div className={styles.options}>
        <button type="button" className={styles.optionButton} onClick={() => onAnswer(true)}>
          {question.trueLabel}
        </button>
        <button type="button" className={styles.optionButton} onClick={() => onAnswer(false)}>
          {question.falseLabel}
        </button>
      </div>
    </fieldset>
  );
}
