import type { AppBootstrap } from './bootstrap';
import type { Step, TaskStep } from '../../domain/model/step';
import type { Requirement } from '../../domain/model/requirement';
import type { Channel, Provider } from '../../domain/model/provider';
import type { SourceDefinition, SourceVerification } from '../../domain/model/source';

/**
 * Real canonical relationships only, per the frozen WU007 scope:
 *   Step -> Provider/Channel -> Provider.sourceId -> SourceDefinition
 *   Requirement -> decisionReferenceIds -> DecisionReference.sourceIds -> SourceDefinition
 * No relationship is invented when the graph does not declare one; callers
 * see `undefined`/empty arrays rather than a synthesized placeholder.
 */
export interface ResolvedSource {
  readonly source: SourceDefinition;
  readonly latestVerification: SourceVerification | undefined;
}

export interface StepSourceDisclosure {
  readonly provider: Provider | undefined;
  readonly channel: Channel | undefined;
  readonly source: ResolvedSource | undefined;
}

export interface RequirementSourceDisclosure {
  readonly requirement: Requirement;
  readonly sources: readonly ResolvedSource[];
}

export class SourceDisclosureIndex {
  private readonly providersById: ReadonlyMap<string, Provider>;
  private readonly sourcesById: ReadonlyMap<string, SourceDefinition>;
  private readonly verificationsBySourceId: ReadonlyMap<string, readonly SourceVerification[]>;
  private readonly decisionReferencesById: ReadonlyMap<string, AppBootstrap['decisionReferences'][number]>;

  constructor(bootstrap: AppBootstrap) {
    this.providersById = new Map(bootstrap.providers.map((provider) => [provider.id, provider]));
    this.sourcesById = new Map(bootstrap.sources.map((source) => [source.id, source]));
    const verifications = new Map<string, SourceVerification[]>();
    for (const verification of bootstrap.sourceVerifications) {
      const list = verifications.get(verification.sourceId) ?? [];
      list.push(verification);
      verifications.set(verification.sourceId, list);
    }
    this.verificationsBySourceId = verifications;
    this.decisionReferencesById = new Map(
      bootstrap.decisionReferences.map((decision) => [decision.id, decision]),
    );
  }

  private resolveSource(sourceId: string): ResolvedSource | undefined {
    const source = this.sourcesById.get(sourceId);
    if (source === undefined) return undefined;
    const verifications = this.verificationsBySourceId.get(sourceId) ?? [];
    const latestVerification =
      verifications.length === 0
        ? undefined
        : verifications.reduce((latest, entry) => (entry.checkedAt > latest.checkedAt ? entry : latest));
    return { source, latestVerification };
  }

  forStep(step: Step): StepSourceDisclosure {
    if (step.kind !== 'task') {
      return { provider: undefined, channel: undefined, source: undefined };
    }
    const taskStep: TaskStep = step;
    const provider = taskStep.providerId ? this.providersById.get(taskStep.providerId) : undefined;
    const channel = provider?.channels.find((entry) => entry.id === taskStep.channelId);
    const source = provider ? this.resolveSource(provider.sourceId) : undefined;
    return { provider, channel, source };
  }

  forRequirement(requirement: Requirement): RequirementSourceDisclosure {
    const sourceIds = new Set<string>();
    for (const decisionId of requirement.decisionReferenceIds) {
      const decision = this.decisionReferencesById.get(decisionId);
      decision?.sourceIds.forEach((id) => sourceIds.add(id));
    }
    const sources = [...sourceIds]
      .map((id) => this.resolveSource(id))
      .filter((entry): entry is ResolvedSource => entry !== undefined);
    return { requirement, sources };
  }
}
