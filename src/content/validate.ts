import type { Condition } from '../domain/model/condition';
import type { ContentGraph } from './graph';

/**
 * `content:check` cross-reference and freshness validation. Individual
 * entity *shape* is already enforced by the WU002 Zod schemas (see
 * `parseContentGraph`); this module validates properties that only exist
 * once a whole content package is assembled: reference integrity across
 * entities, condition fact references, source provenance, and freshness
 * risk coverage. All checks are pure and read-only over the content graph.
 */

export type ContentIssueKind =
  | 'duplicateId'
  | 'danglingReference'
  | 'invalidCondition'
  | 'missingSourceVerification'
  | 'staleHighRiskSource';

export interface ContentIssue {
  readonly kind: ContentIssueKind;
  readonly entityKind: string;
  readonly id: string;
  readonly detail: string;
}

function issue(kind: ContentIssueKind, entityKind: string, id: string, detail: string): ContentIssue {
  return { kind, entityKind, id, detail };
}

/**
 * Every entity kind shares one id namespace check: ids must be unique
 * *within* their own collection. Cross-collection id collisions (e.g. a
 * route and a step sharing an id) are not treated as errors here because
 * every reference field already carries its own entity-kind context, but
 * within-collection duplicates would make `content:check`'s own duplicate
 * detection ambiguous about which entity a reference resolves to.
 */
function checkDuplicateIds(entityKind: string, items: readonly { id: string }[]): ContentIssue[] {
  const seen = new Map<string, number>();
  for (const item of items) {
    seen.set(item.id, (seen.get(item.id) ?? 0) + 1);
  }
  const issues: ContentIssue[] = [];
  for (const [id, count] of seen) {
    if (count > 1) {
      issues.push(issue('duplicateId', entityKind, id, `id declared ${count} times in ${entityKind}`));
    }
  }
  return issues;
}

function checkRef(
  entityKind: string,
  id: string,
  refKind: string,
  refId: string,
  index: ReadonlySet<string>,
  issues: ContentIssue[],
): void {
  if (!index.has(refId)) {
    issues.push(issue('danglingReference', entityKind, id, `references unknown ${refKind} "${refId}"`));
  }
}

/**
 * Walks a Condition AST and reports any leaf whose `fact` key is not a
 * declared fact. Facts have no canonical registry entity (see
 * domain/model/fact.ts: a fact is identified only by its key), so this
 * checks structural well-formedness -- a non-empty, non-blank key -- rather
 * than membership in a closed set. An empty/whitespace-only fact key can
 * never evaluate meaningfully and is treated as an invalid condition.
 */
function checkCondition(entityKind: string, id: string, condition: Condition, issues: ContentIssue[]): void {
  switch (condition.kind) {
    case 'factEquals':
    case 'factIn':
    case 'factContains':
    case 'factTruthy':
    case 'factPresent':
      if (condition.fact.trim().length === 0) {
        issues.push(issue('invalidCondition', entityKind, id, 'condition references a blank fact key'));
      }
      return;
    case 'allOf':
    case 'anyOf':
      for (const child of condition.conditions) checkCondition(entityKind, id, child, issues);
      return;
    case 'not':
      checkCondition(entityKind, id, condition.condition, issues);
  }
}

export function checkContentGraph(content: ContentGraph): ContentIssue[] {
  const issues: ContentIssue[] = [];

  issues.push(...checkDuplicateIds('lifeEvent', content.lifeEvents));
  issues.push(...checkDuplicateIds('destination', content.destinations));
  issues.push(...checkDuplicateIds('route', content.routes));
  issues.push(...checkDuplicateIds('routeVariant', content.routeVariants));
  issues.push(...checkDuplicateIds('step', content.steps));
  issues.push(...checkDuplicateIds('requirement', content.requirements));
  issues.push(...checkDuplicateIds('requirementGroup', content.requirementGroups));
  issues.push(...checkDuplicateIds('provider', content.providers));
  issues.push(...checkDuplicateIds('source', content.sources));
  issues.push(...checkDuplicateIds('decisionReference', content.decisionReferences));

  const destinationIds = new Set(content.destinations.map((entity) => entity.id));
  const routeIds = new Set(content.routes.map((entity) => entity.id));
  const routeVariantIds = new Set(content.routeVariants.map((entity) => entity.id));
  const stepIds = new Set(content.steps.map((entity) => entity.id));
  const requirementIds = new Set(content.requirements.map((entity) => entity.id));
  const requirementGroupIds = new Set(content.requirementGroups.map((entity) => entity.id));
  const providerIds = new Set(content.providers.map((entity) => entity.id));
  const sourceIds = new Set(content.sources.map((entity) => entity.id));
  const decisionReferenceIds = new Set(content.decisionReferences.map((entity) => entity.id));

  for (const lifeEvent of content.lifeEvents) {
    for (const destinationId of lifeEvent.destinationIds) {
      checkRef('lifeEvent', lifeEvent.id, 'destination', destinationId, destinationIds, issues);
    }
  }

  for (const destination of content.destinations) {
    for (const routeId of destination.routeIds) {
      checkRef('destination', destination.id, 'route', routeId, routeIds, issues);
    }
  }

  for (const route of content.routes) {
    for (const stepId of route.stepIds) {
      checkRef('route', route.id, 'step', stepId, stepIds, issues);
    }
    for (const variantId of route.variantIds) {
      checkRef('route', route.id, 'routeVariant', variantId, routeVariantIds, issues);
    }
    if (route.appliesWhen) checkCondition('route', route.id, route.appliesWhen, issues);
  }

  for (const variant of content.routeVariants) {
    for (const stepId of variant.stepIds) {
      checkRef('routeVariant', variant.id, 'step', stepId, stepIds, issues);
    }
    checkCondition('routeVariant', variant.id, variant.appliesWhen, issues);
  }

  for (const step of content.steps) {
    for (const requirementId of step.requirementIds) {
      checkRef('step', step.id, 'requirement', requirementId, requirementIds, issues);
    }
    for (const groupId of step.requirementGroupIds) {
      checkRef('step', step.id, 'requirementGroup', groupId, requirementGroupIds, issues);
    }
    for (const dependsOnId of step.dependsOnStepIds) {
      checkRef('step', step.id, 'step', dependsOnId, stepIds, issues);
    }
    if (step.appliesWhen) checkCondition('step', step.id, step.appliesWhen, issues);
    if (step.kind === 'task' && step.providerId !== undefined) {
      checkRef('step', step.id, 'provider', step.providerId, providerIds, issues);
    }
    if (step.kind === 'task' && step.channelId !== undefined) {
      const provider = step.providerId ? content.providers.find((entity) => entity.id === step.providerId) : undefined;
      const channelIds = new Set((provider?.channels ?? []).map((channel) => channel.id));
      if (!channelIds.has(step.channelId)) {
        issues.push(
          issue('danglingReference', 'step', step.id, `references unknown channel "${step.channelId}" on its provider`),
        );
      }
    }
    if (step.kind === 'subjourney') {
      checkRef('step', step.id, 'destination', step.destinationId, destinationIds, issues);
    }
  }

  for (const requirement of content.requirements) {
    if (requirement.appliesWhen) checkCondition('requirement', requirement.id, requirement.appliesWhen, issues);
    for (const decisionId of requirement.decisionReferenceIds) {
      checkRef('requirement', requirement.id, 'decisionReference', decisionId, decisionReferenceIds, issues);
    }
  }

  for (const group of content.requirementGroups) {
    for (const requirementId of group.requirementIds) {
      checkRef('requirementGroup', group.id, 'requirement', requirementId, requirementIds, issues);
    }
  }

  for (const provider of content.providers) {
    checkRef('provider', provider.id, 'source', provider.sourceId, sourceIds, issues);
  }

  for (const decisionReference of content.decisionReferences) {
    for (const sourceId of decisionReference.sourceIds) {
      checkRef('decisionReference', decisionReference.id, 'source', sourceId, sourceIds, issues);
    }
  }

  for (const source of content.sources) {
    for (const supportedId of source.supports) {
      const known =
        decisionReferenceIds.has(supportedId) ||
        requirementIds.has(supportedId) ||
        stepIds.has(supportedId) ||
        providerIds.has(supportedId);
      if (!known) {
        issues.push(
          issue('danglingReference', 'source', source.id, `"supports" references unknown entity "${supportedId}"`),
        );
      }
    }
  }

  const verifiedSourceIds = new Set(content.sourceVerifications.map((verification) => verification.sourceId));
  for (const verification of content.sourceVerifications) {
    checkRef('sourceVerification', verification.sourceId, 'source', verification.sourceId, sourceIds, issues);
  }

  /**
   * Decision-bearing rules must retain source provenance: a Requirement
   * that gates or justifies behavior is only trustworthy when its
   * decisionReferenceIds resolve to real DecisionReferences (checked above
   * as danglingReference), each of which is schema-required to cite at
   * least one source. The remaining content-level guarantee is that every
   * declared Source is actually backed by a recorded observation -- a
   * Source that has never been verified cannot support any freshness
   * claim, decision-bearing or not.
   */
  for (const source of content.sources) {
    if (!verifiedSourceIds.has(source.id)) {
      issues.push(
        issue(
          'missingSourceVerification',
          'source',
          source.id,
          'source has no recorded SourceVerification (HTTP/link health must not stand in for content-freshness proof)',
        ),
      );
    }
  }

  /**
   * High-freshness-risk stale rules must not silently remain current: a
   * `high` freshnessRisk source's latest verification must not report
   * `contentFreshness: 'stale'` without content:check surfacing it as an
   * issue -- staleness on a high-risk source is never treated as
   * acceptable content state. Link health (`linkHealth`) is deliberately
   * not consulted here: it proves reachability, not freshness (see
   * SourceVerification in domain/model/source.ts).
   */
  for (const source of content.sources) {
    if (source.freshnessRisk !== 'high') continue;
    const verifications = content.sourceVerifications.filter((entry) => entry.sourceId === source.id);
    if (verifications.length === 0) continue; // already reported as missingSourceVerification
    const latest = verifications.reduce((mostRecent, entry) =>
      entry.checkedAt > mostRecent.checkedAt ? entry : mostRecent,
    );
    if (latest.contentFreshness === 'stale') {
      issues.push(
        issue(
          'staleHighRiskSource',
          'source',
          source.id,
          `high freshness-risk source's latest verification (${latest.checkedAt}) reports stale content`,
        ),
      );
    }
  }

  return issues;
}
