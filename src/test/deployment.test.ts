import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('deployment baseline & environment contract (WU009)', () => {
  it('defines vercel.json with a pinned framework and lockfile-aligned install/build commands', () => {
    const raw = readFileSync(join(repoRoot, 'vercel.json'), 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    expect(config.framework).toBe('nextjs');
    expect(config.installCommand).toBe('pnpm install --frozen-lockfile');
    expect(config.buildCommand).toBe('pnpm build');
  });

  it('does not duplicate the Node/pnpm runtime pin in vercel.json (single source of truth in package.json)', () => {
    const raw = readFileSync(join(repoRoot, 'vercel.json'), 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    expect(config).not.toHaveProperty('engines');
    expect(config).not.toHaveProperty('nodeVersion');
  });

  it('pins an exact Node engine and package manager version in package.json', () => {
    const raw = readFileSync(join(repoRoot, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as {
      engines?: { node?: string };
      packageManager?: string;
    };

    expect(pkg.engines?.node).toBe('24.x');
    expect(pkg.packageManager).toMatch(/^pnpm@/);
  });

  it('has no application source that reads process.env (no environment-variable dependency today)', () => {
    const envAccessPattern = ['process', '.', 'env'].join('');
    const sourceFiles = listSourceFiles(join(repoRoot, 'src')).filter(
      (file) => file !== join(__dirname, 'deployment.test.ts'),
    );
    const offenders = sourceFiles.filter((file) =>
      readFileSync(file, 'utf-8').includes(envAccessPattern),
    );

    expect(offenders).toEqual([]);
  });

  it('documents the environment/secrets contract and deployment runbook', () => {
    expect(() =>
      readFileSync(join(repoRoot, 'docs/deployment/environment.md'), 'utf-8'),
    ).not.toThrow();
    expect(() =>
      readFileSync(join(repoRoot, 'docs/deployment/runbook.md'), 'utf-8'),
    ).not.toThrow();
  });
});
