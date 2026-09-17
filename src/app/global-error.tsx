'use client';

import styles from './error.module.css';

/** Last-resort recovery when the root layout itself cannot render. */
export default function GlobalError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="pt-PT">
      <body>
        <main className={styles.fallback}>
          <section className={styles.panel} aria-labelledby="global-recovery-title">
            <h1 id="global-recovery-title" className={styles.title}>
              O Rumo está temporariamente indisponível
            </h1>
            <p className={styles.message}>Tente novamente dentro de momentos.</p>
            <button type="button" className={styles.retry} onClick={reset}>
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
