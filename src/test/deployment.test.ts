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

  it("only reads Vercel's non-secret Git revision system variable for release identity", () => {
    const envAccessPattern = ['process', '.', 'env'].join('');
    const sourceFiles = listSourceFiles(join(repoRoot, 'src')).filter(
      (file) => file !== join(__dirname, 'deployment.test.ts'),
    );
    const envReaders = sourceFiles.filter((file) => readFileSync(file, 'utf-8').includes(envAccessPattern));

    expect(envReaders).toEqual([join(repoRoot, 'src', 'app', 'page.tsx')]);
    expect(readFileSync(envReaders[0], 'utf-8')).toContain('process.env.VERCEL_GIT_COMMIT_SHA');
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

describe('HTTP security baseline (WU011)', () => {
  it('defines the response security-header baseline in Next.js configuration', () => {
    const config = readFileSync(join(repoRoot, 'next.config.ts'), 'utf-8');

    expect(config).toContain("key: 'Content-Security-Policy'");
    expect(config).toContain("default-src 'self'");
    expect(config).toContain("base-uri 'self'");
    expect(config).toContain("form-action 'self'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("key: 'X-Frame-Options', value: 'DENY'");
    expect(config).toContain("key: 'X-Content-Type-Options', value: 'nosniff'");
    expect(config).toContain("key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'");
    expect(config).toContain("key: 'Permissions-Policy'");
    expect(config).toContain("key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'");
    expect(config).toContain("source: '/:path*'");
  });
});

describe('runtime resilience and release identity (WU012)', () => {
  it('provides route and root error boundaries with non-sensitive recovery actions', () => {
    const routeError = readFileSync(join(repoRoot, 'src', 'app', 'error.tsx'), 'utf-8');
    const globalError = readFileSync(join(repoRoot, 'src', 'app', 'global-error.tsx'), 'utf-8');

    expect(routeError).toContain("'use client'");
    expect(routeError).toContain('onClick={reset}');
    expect(routeError).not.toContain('error.message');
    expect(globalError).toContain("'use client'");
    expect(globalError).toContain('<html lang="pt-PT">');
    expect(globalError).toContain('<body>');
    expect(globalError).toContain('onClick={reset}');
    expect(globalError).not.toContain('error.message');
  });
});
