# Release CI contract

Pull requests are validated by `.github/workflows/ci.yml`. The workflow also
runs after pushes to `main`; it does not add a milestone-branch push trigger or
a deployment path.

## Protected result

The canonical GitHub Actions job/check name is `validation`. Repository
governance may require that check by name, so it must remain stable. All
release-quality gates execute sequentially inside that one job:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm content:check`
5. `pnpm test:e2e`
6. `pnpm build`

GitHub Actions stops the remaining default-success steps after a failure or
cancellation. Because there is no independent aggregator or allowed-failure
sub-job, `validation` cannot report success when a required gate failed. A
skipped later step therefore accompanies a non-successful job rather than a
false successful protected result.

## Deterministic runtime and install

CI uses Node 24 and pnpm 11.27.0, matching `engines.node` and
`packageManager` in `package.json`. Dependencies are installed with
`pnpm install --frozen-lockfile`; the pnpm cache accelerates installation but
does not replace or modify the lockfile-resolved dependency graph. The
production build remains the canonical `pnpm build`, matching `vercel.json`.

Before browser smoke tests, CI runs
`pnpm exec playwright install --with-deps chromium`. The Playwright package is
resolved from the frozen lockfile, and only the configured Chromium project
and its system dependencies are installed. `playwright.config.ts` owns the
development-server readiness and lifecycle, including shutdown after the test
run; the smoke suite retains its existing axe accessibility checks.

`src/test/ci/ci-contract.test.ts` guards the check identity, release commands,
frozen install, browser install, and runtime-pin alignment against accidental
drift.
