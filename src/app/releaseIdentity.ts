const gitRevisionPattern = /^[0-9a-f]{7,64}$/i;

export interface ReleaseIdentity {
  readonly revision: string | null;
  readonly label: string;
}

/**
 * Produces a display-safe release identity from Vercel's Git integration.
 * A revision is deliberately accepted only when it is a Git object ID; this
 * keeps deployment configuration or any other environment value out of the
 * rendered diagnostic surface.
 */
export function resolveReleaseIdentity(revision: string | undefined): ReleaseIdentity {
  if (revision && gitRevisionPattern.test(revision)) {
    return { revision, label: `Git revision ${revision}` };
  }

  return { revision: null, label: 'Local or unverified build' };
}
