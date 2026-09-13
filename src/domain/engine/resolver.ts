/**
 * Deterministic resolver evidence shared across the engine. Missing ids and
 * cycles are canonical-content problems WU004 (`content:check`) is
 * responsible for rejecting before publish; the engine itself never crashes
 * or silently ignores them -- it reports them as structured, deterministic
 * evidence the caller/UI can surface.
 */

export type ResolverIssueKind = 'missingReference' | 'cycle';

export interface ResolverIssue {
  readonly kind: ResolverIssueKind;
  /** Entity kind of the id that could not be resolved, or that participates in a cycle. */
  readonly entityKind: string;
  readonly id: string;
  /** Id of the entity that referenced `id`, when relevant (absent for a cycle root). */
  readonly referencedFrom?: string;
}

export function missingReference(entityKind: string, id: string, referencedFrom?: string): ResolverIssue {
  return { kind: 'missingReference', entityKind, id, referencedFrom };
}

export function cycleDetected(entityKind: string, id: string): ResolverIssue {
  return { kind: 'cycle', entityKind, id };
}

/**
 * A lookup table keyed by entity id. The engine only ever reads these -- it
 * never mutates canonical content.
 */
export type EntityIndex<T> = ReadonlyMap<string, T>;

export function lookup<T>(index: EntityIndex<T>, id: string): T | undefined {
  return index.get(id);
}
