'use client';

import styles from './error.module.css';

/** Route-level recovery for an unexpected render failure. */
export default function Error({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className={styles.fallback}>
      <section className={styles.panel} aria-labelledby="recovery-title">
        <h1 id="recovery-title" className={styles.title}>
          Não foi possível carregar o Rumo
        </h1>
        <p className={styles.message}>
          O seu progresso guardado neste dispositivo não foi alterado. Tente novamente para continuar.
        </p>
        <button type="button" className={styles.retry} onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
