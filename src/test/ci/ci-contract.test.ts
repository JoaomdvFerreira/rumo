import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const packageJson = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as {
  engines: { node: string };
  packageManager: string;
};

function runCommands() {
  return [...workflow.matchAll(/^\s+-?\s*run:\s*(.+)$/gm)].map(
    ([, command]) => command.trim(),
  );
}

describe('release CI contract', () => {
  it('preserves the protected validation check identity on pull requests', () => {
    expect(workflow).toMatch(/^name: Project validation$/m);
    expect(workflow).toMatch(/^  pull_request:$/m);
    expect(workflow).toMatch(/^  validation:$/m);
    expect(workflow).toMatch(/^    name: validation$/m);
  });

  it('runs every release-quality command in the protected job', () => {
    expect(runCommands()).toEqual(
      expect.arrayContaining([
        'pnpm lint',
        'pnpm typecheck',
        'pnpm test',
        'pnpm content:check',
        'pnpm test:e2e',
        'pnpm build',
      ]),
    );
  });

  it('uses a frozen install and installs only the configured browser', () => {
    expect(runCommands()).toContain('pnpm install --frozen-lockfile');
    expect(runCommands()).toContain(
      'pnpm exec playwright install --with-deps chromium',
    );
  });

  it('keeps CI runtime pins aligned with package.json', () => {
    const nodeMajor = packageJson.engines.node.match(/^(\d+)/)?.[1];
    const pnpmVersion = packageJson.packageManager.match(/^pnpm@([^+]+)/)?.[1];

    expect(nodeMajor).toBeDefined();
    expect(pnpmVersion).toBeDefined();
    expect(workflow).toContain(`node-version: ${nodeMajor}`);
    expect(workflow).toMatch(/^\s*- uses: pnpm\/action-setup@v4$/m);
    expect(workflow).not.toMatch(/^\s+version:/m);
  });
});
