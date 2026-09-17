import { describe, expect, it } from 'vitest';

import { resolveReleaseIdentity } from './releaseIdentity';

describe('resolveReleaseIdentity', () => {
  it('preserves an exact Git revision for a deployed candidate', () => {
    const revision = 'a3f5e8d1c2b4a697887766554433221100ffeedd';

    expect(resolveReleaseIdentity(revision)).toEqual({
      revision,
      label: `Git revision ${revision}`,
    });
  });

  it('does not surface arbitrary environment content as release identity', () => {
    expect(resolveReleaseIdentity('resident-name@example.test')).toEqual({
      revision: null,
      label: 'Local or unverified build',
    });
  });
});
