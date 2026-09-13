import type { ResumeReason } from '../../persistence/resume';

/**
 * Maps WU005's `ResumeReason` to a concise, non-alarming user-facing
 * notice. Reasons that represent normal, silent operation (`restoredCurrent`,
 * `freshStart`, `migratedSchema`) surface no notice at all -- only outcomes
 * that actually discarded or could not persist progress are worth telling
 * the user about.
 */
export function restorationNoticeFor(
  reason: ResumeReason,
  discardedSessionIds: readonly string[],
): string | undefined {
  switch (reason) {
    case 'revalidatedContentChange':
      return discardedSessionIds.length > 0
        ? 'O conteúdo foi atualizado e parte do seu progresso guardado já não era válido, por isso foi removido.'
        : undefined;
    case 'resetMalformedJson':
    case 'resetInvalidSchema':
    case 'resetUnsupportedVersion':
      return 'Não foi possível ler o progresso guardado anteriormente, por isso foi reiniciado.';
    case 'resetStorageUnavailable':
      return undefined;
    case 'freshStart':
    case 'migratedSchema':
    case 'restoredCurrent':
      return undefined;
  }
}
