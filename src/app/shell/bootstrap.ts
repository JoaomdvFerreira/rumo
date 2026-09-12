import { buildRevalidationContentIndex } from '../../persistence/contentIndex';
import { canonicalContent, contentHash, intentCatalog } from '../../content';
import type { Destination, Route, RouteVariant } from '../../domain/model/routing';
import type { Requirement, RequirementGroup } from '../../domain/model/requirement';
import type { Step } from '../../domain/model/step';
import type { Provider } from '../../domain/model/provider';
import type { SourceDefinition, SourceVerification } from '../../domain/model/source';
import type { DecisionReference } from '../../domain/model/decision';
import type { IntentCatalog } from '../../domain/model/intent';

/**
 * Server-only aggregation point: this is where WU005's Node-crypto-dependent
 * fingerprint/content-hash computation happens (via canonicalContent's
 * module-load contentHash and buildRevalidationContentIndex). Only
 * page.tsx (a Server Component) may import this module -- a Client
 * Component must never import it directly, or it drags node:crypto into
 * the browser bundle. Everything returned from `buildAppBootstrap` is
 * plain, JSON-serializable data -- no Map/Set, no functions -- so it can
 * cross the Server->Client Component boundary safely and be reconstructed
 * client-side (see shell/reconstruct.ts).
 */

export interface SerializableRevalidationContentIndex {
  readonly destinationIds: readonly string[];
  readonly stepFingerprints: readonly (readonly [string, string])[];
  readonly requirementFingerprints: readonly (readonly [string, string])[];
  readonly reachableStepIdsByDestination: readonly (readonly [string, readonly string[]])[];
  readonly reachableRequirementIdsByDestination: readonly (readonly [string, readonly string[]])[];
}

export interface AppBootstrap {
  readonly contentVersion: string;
  readonly destinations: readonly Destination[];
  readonly routes: readonly Route[];
  readonly routeVariants: readonly RouteVariant[];
  readonly steps: readonly Step[];
  readonly requirements: readonly Requirement[];
  readonly requirementGroups: readonly RequirementGroup[];
  readonly providers: readonly Provider[];
  readonly sources: readonly SourceDefinition[];
  readonly sourceVerifications: readonly SourceVerification[];
  readonly decisionReferences: readonly DecisionReference[];
  readonly intentCatalog: IntentCatalog;
  readonly revalidationContentIndex: SerializableRevalidationContentIndex;
}

export function buildAppBootstrap(): AppBootstrap {
  const revalidationIndex = buildRevalidationContentIndex(canonicalContent);

  return {
    contentVersion: contentHash,
    destinations: canonicalContent.destinations,
    routes: canonicalContent.routes,
    routeVariants: canonicalContent.routeVariants,
    steps: canonicalContent.steps,
    requirements: canonicalContent.requirements,
    requirementGroups: canonicalContent.requirementGroups,
    providers: canonicalContent.providers,
    sources: canonicalContent.sources,
    sourceVerifications: canonicalContent.sourceVerifications,
    decisionReferences: canonicalContent.decisionReferences,
    intentCatalog,
    revalidationContentIndex: {
      destinationIds: [...revalidationIndex.destinationIds],
      stepFingerprints: [...revalidationIndex.stepFingerprints],
      requirementFingerprints: [...revalidationIndex.requirementFingerprints],
      reachableStepIdsByDestination: [...revalidationIndex.reachableStepIdsByDestination].map(
        ([id, ids]) => [id, [...ids]] as const,
      ),
      reachableRequirementIdsByDestination: [...revalidationIndex.reachableRequirementIdsByDestination].map(
        ([id, ids]) => [id, [...ids]] as const,
      ),
    },
  };
}
