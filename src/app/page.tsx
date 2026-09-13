import { AppShell } from './shell/AppShell';
import { buildAppBootstrap } from './shell/bootstrap';

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
  return <AppShell bootstrap={bootstrap} />;
}
