import { AppShell } from './shell/AppShell';
import { buildAppBootstrap } from './shell/bootstrap';
import { resolveReleaseIdentity } from './releaseIdentity';

/**
 * Server Component boundary (WU007 "SERVER / CLIENT BOUNDARY"): all
 * Node-crypto-dependent bootstrap work (content hashing, semantic
 * fingerprinting) happens in `buildAppBootstrap`, which runs only here,
 * server-side. `AppShell` (a Client Component) receives only the plain,
 * serializable result -- it never imports `../../content` or
 * `../../persistence/contentIndex` directly, so `node:crypto` never
 * reaches the browser bundle (verified via `pnpm build`).
 */
export default function Home() {
  const bootstrap = buildAppBootstrap();
  const release = resolveReleaseIdentity(process.env.VERCEL_GIT_COMMIT_SHA);

  return (
    <>
      <AppShell bootstrap={bootstrap} />
      <footer aria-label="Identidade da versão">
        <small>{release.label}</small>
      </footer>
    </>
  );
}
