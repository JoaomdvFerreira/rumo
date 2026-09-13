/**
 * The three frozen common scenarios (WU007 spec, "HOME / INTENT ENTRY").
 * Each label is the exact alias phrase already declared in the canonical
 * intent catalog (src/content/intents.ts) for that scenario's
 * `alias.*-launch-label` alias, so clicking a scenario runs through the
 * identical `matchIntents` (WU006) path as typed search -- no parallel
 * "scenario -> destination" mapping is introduced here.
 */
export interface CommonScenario {
  readonly id: string;
  readonly label: string;
}

export const COMMON_SCENARIOS: readonly CommonScenario[] = [
  { id: 'scenario.move-home', label: 'Mudar de casa' },
  { id: 'scenario.energy', label: 'Eletricidade e gás na nova casa' },
  { id: 'scenario.internet', label: 'Internet numa mudança' },
];
