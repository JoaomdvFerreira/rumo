/**
 * Shared deterministic tie-break: highest `priority`, then canonical
 * declaration/reference order (the order candidates are passed in), then
 * stable id as the final tie-breaker. Used for Route selection, RouteVariant
 * selection, and next-action/parallel-work Step ordering alike so the same
 * rule governs every "pick one of several applicable things" decision.
 */
export interface Prioritized {
  readonly id: string;
  readonly priority: number;
}

/**
 * Sort a full list by the tie-break rule: priority desc, then declaration
 * order (the input order) preserved via a stable sort, then id asc.
 */
export function sortByPriority<T extends Prioritized>(candidates: readonly T[]): T[] {
  return candidates
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.priority !== b.item.priority) return b.item.priority - a.item.priority;
      if (a.index !== b.index) return a.index - b.index;
      return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
    })
    .map(({ item }) => item);
}

export function selectByPriority<T extends Prioritized>(candidates: readonly T[]): T | undefined {
  return sortByPriority(candidates)[0];
}
