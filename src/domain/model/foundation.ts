/**
 * Pure domain utility: a foundation label must be non-empty after trimming.
 * This module deliberately has no framework or platform dependencies.
 */
export function isNonEmptyLabel(value: string): boolean {
  return value.trim().length > 0;
}
