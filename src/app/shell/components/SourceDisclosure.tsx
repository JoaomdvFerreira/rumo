'use client';

import styles from './SourceDisclosure.module.css';
import { officialSourceUrl } from '../sourceDisclosure';
import type { ResolvedSource } from '../sourceDisclosure';
import type { Channel, Provider } from '../../../domain/model/provider';

export interface SourceDisclosureProps {
  readonly provider?: Provider;
  readonly channel?: Channel;
  readonly source?: ResolvedSource;
}

/**
 * Provider/channel/source disclosure (WU007 "SOURCE / PROVIDER
 * DISCLOSURE"): visible but deliberately secondary -- rendered as a small
 * disclosure block, never the visual focus of a step. Renders nothing for
 * a relationship the canonical graph does not declare, rather than
 * inventing placeholder provenance. F3 remediation (Project Overseer review
 * of WU007/C007): the official source link is rendered whenever `source` is
 * present, independent of `provider`/`channel` -- a Requirement's
 * provenance (Requirement -> DecisionReference -> Source) never has a
 * Channel, so it must still be openable via the canonical
 * `SourceDefinition.url` (see `officialSourceUrl`).
 */
export function SourceDisclosure({ provider, channel, source }: SourceDisclosureProps) {
  if (!provider && !source) return null;

  return (
    <div className={styles.wrapper}>
      {provider && (
        <p className={styles.line}>
          <span className={styles.label}>Entidade:</span> {provider.name}
          {channel ? ` — ${channel.label}` : ''}
        </p>
      )}
      {channel?.url && (
        <p className={styles.line}>
          <a className={styles.link} href={channel.url} target="_blank" rel="noreferrer noopener">
            Abrir canal oficial
            <span className={styles.external}> (site externo)</span>
          </a>
        </p>
      )}
      {source && (
        <p className={styles.line}>
          <span className={styles.label}>Fonte:</span> {source.source.publisher} — {source.source.title}
          {source.latestVerification?.contentReviewedAt && (
            <span className={styles.verified}>
              {' '}
              (verificado em {source.latestVerification.contentReviewedAt.slice(0, 10)})
            </span>
          )}
        </p>
      )}
      {source && (
        <p className={styles.line}>
          <a className={styles.link} href={officialSourceUrl(source)} target="_blank" rel="noreferrer noopener">
            Abrir fonte oficial
            <span className={styles.external}> (site externo)</span>
          </a>
        </p>
      )}
    </div>
  );
}
