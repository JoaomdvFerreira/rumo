import { z } from 'zod';

import { contentGraph } from '../../content/data';

/**
 * The complete, deliberately small telemetry vocabulary for the MVP.
 *
 * Events may identify a canonical application entity or a fixed application
 * state, but must never carry user-entered search text, fact keys, fact
 * values, addresses, names, or any other administrative content. The strict
 * schemas below reject every field outside this allow-list at the provider
 * boundary as a second line of defence for non-TypeScript callers.
 */
/**
 * Provider-visible identifiers must be existing IDs from Rumo's canonical
 * content, and each event may use only the entity category it describes.
 * A shape-only check would still permit free-form text such as a name or
 * address disguised as an identifier.
 */
function canonicalContentIdSchema(ids: readonly string[], entity: string) {
  const canonicalIds = new Set(ids);

  return z.string().refine((id) => canonicalIds.has(id), {
    message: `Expected a canonical Rumo ${entity} identifier`,
  });
}

const destinationIdSchema = canonicalContentIdSchema(
  contentGraph.destinations.map(({ id }) => id),
  'destination',
);
const requirementIdSchema = canonicalContentIdSchema(
  contentGraph.requirements.map(({ id }) => id),
  'requirement',
);
const sourceIdSchema = canonicalContentIdSchema(
  contentGraph.sources.map(({ id }) => id),
  'source',
);

const telemetryEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('session_started') }),
  z.strictObject({ type: z.literal('destination_resolved'), destinationId: destinationIdSchema }),
  z.strictObject({ type: z.literal('requirement_confirmed'), requirementId: requirementIdSchema }),
  z.strictObject({ type: z.literal('source_disclosed'), sourceId: sourceIdSchema }),
  z.strictObject({ type: z.literal('persistence_unavailable') }),
]);

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

/** A future provider receives only validated allow-list events. */
export interface TelemetryProvider {
  record(event: TelemetryEvent): void;
}

export interface Telemetry {
  /**
   * Records an allow-listed event on a best-effort basis. Invalid events and
   * provider failures are intentionally ignored so telemetry never changes
   * the user's ability to continue their home-moving journey.
   */
  track(event: unknown): void;
}

/**
 * Creates the privacy boundary used by product code. No provider is supplied
 * in this MVP, so calls are local no-ops. Introducing one is an owner decision
 * because it would send the validated events beyond this application.
 */
export function createTelemetry(provider?: TelemetryProvider): Telemetry {
  return {
    track(event: unknown): void {
      const parsed = telemetryEventSchema.safeParse(event);
      if (!parsed.success) return;

      try {
        provider?.record(parsed.data);
      } catch {
        // Observability is non-blocking by contract.
      }
    },
  };
}

export const telemetryEvents = {
  sessionStarted: (): TelemetryEvent => ({ type: 'session_started' }),
  destinationResolved: (destinationId: string): TelemetryEvent => ({
    type: 'destination_resolved',
    destinationId,
  }),
  requirementConfirmed: (requirementId: string): TelemetryEvent => ({
    type: 'requirement_confirmed',
    requirementId,
  }),
  sourceDisclosed: (sourceId: string): TelemetryEvent => ({ type: 'source_disclosed', sourceId }),
  persistenceUnavailable: (): TelemetryEvent => ({ type: 'persistence_unavailable' }),
} as const;
