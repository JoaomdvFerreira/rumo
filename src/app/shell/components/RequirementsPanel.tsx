'use client';

import styles from './RequirementsPanel.module.css';
import { SourceDisclosure } from './SourceDisclosure';
import type { PathStep } from '../../../domain/engine/destination';
import type { Requirement, RequirementGroup } from '../../../domain/model/requirement';
import type { SourceDisclosureIndex } from '../sourceDisclosure';

export interface RequirementsPanelProps {
  readonly blocked: readonly PathStep[];
  readonly requirementsById: ReadonlyMap<string, Requirement>;
  readonly requirementGroupsById: ReadonlyMap<string, RequirementGroup>;
  readonly satisfiedRequirementIds: ReadonlySet<string>;
  readonly sourceIndex: SourceDisclosureIndex;
  readonly onConfirmRequirement: (requirementId: string, satisfied: boolean) => void;
}

/**
 * "Antes de avançar" (WU007 "REQUIREMENTS / BLOCKERS"): renders every
 * unmet Requirement for currently blocked steps, without reproducing
 * allOf/anyOf group logic in React -- the domain engine has already decided
 * these steps are blocked; this panel only lets the user confirm
 * requirements they have personally satisfied, writing to
 * `satisfiedRequirementIds` and letting the engine re-derive actionability
 * on the next render.
 */
export function RequirementsPanel({
  blocked,
  requirementsById,
  requirementGroupsById,
  satisfiedRequirementIds,
  sourceIndex,
  onConfirmRequirement,
}: RequirementsPanelProps) {
  if (blocked.length === 0) return null;

  const requirementIds = new Set<string>();
  for (const pathStep of blocked) {
    const step = pathStep.step;
    for (const id of step.requirementIds) requirementIds.add(id);
    for (const groupId of step.requirementGroupIds) {
      const group = requirementGroupsById.get(groupId);
      group?.requirementIds.forEach((id) => requirementIds.add(id));
    }
  }

  const requirements = [...requirementIds]
    .map((id) => requirementsById.get(id))
    .filter((requirement): requirement is Requirement => requirement !== undefined);

  return (
    <section className={styles.panel} aria-labelledby="requirements-heading">
      <h2 id="requirements-heading" className={styles.heading}>
        Antes de avançar
      </h2>
      <p className={styles.intro}>
        As seguintes tarefas estão bloqueadas até confirmar que estes requisitos estão cumpridos:
      </p>
      <ul className={styles.blockedList}>
        {blocked.map((pathStep) => (
          <li key={pathStep.step.id} className={styles.blockedItem}>
            {pathStep.step.title}
          </li>
        ))}
      </ul>
      <ul className={styles.requirementList}>
        {requirements.map((requirement) => {
          const disclosure = sourceIndex.forRequirement(requirement);
          const satisfied = satisfiedRequirementIds.has(requirement.id);
          const inputId = `requirement-${requirement.id}`;
          return (
            <li key={requirement.id} className={styles.requirementItem}>
              <label className={styles.requirementLabel} htmlFor={inputId}>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={satisfied}
                  onChange={(event) => onConfirmRequirement(requirement.id, event.target.checked)}
                />
                <span>
                  <span className={styles.requirementTitle}>{requirement.title}</span>
                  <span className={styles.requirementDescription}> — {requirement.description}</span>
                </span>
              </label>
              {disclosure.sources.map((resolved) => (
                <SourceDisclosure key={resolved.source.id} source={resolved} />
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
