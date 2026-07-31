# AGENTS.md

Conventions for AI agents and humans working in this repo. Read this before changing anything.

This file is the single source of truth, read natively by Codex, Cursor, Copilot, Gemini CLI, Aider,
Windsurf and Zed. `CLAUDE.md` imports it for Claude Code.

## Commands

| Command | What it does |
|---|---|
| `yarn install` | Install. Required once on the host for editor autocomplete. |
| `yarn dev` | All workspaces in watch mode (Turborepo). Web :3000, API :3001. |
| `yarn build` | Builds `@acme/shared` first, then both apps. |
| `yarn typecheck` | Type-checks every workspace, no emit. |
| `docker compose up` | Runs everything in containers. No host Node needed. |

Always run `yarn build` **and** `yarn typecheck` after changes. There is no test suite (see
*Intentionally absent*), so those two are the only automated safety net.

## Architecture

Three workspaces, Yarn 4 + Turborepo:

```
apps/api          @acme/api      NestJS 11 — GET /health only
apps/web          @acme/web      Vite + React 19 + Tailwind 4
packages/shared   @acme/shared   types + helpers shared by both
```

**`apps/api/src/app.controller.ts` imports `buildHealthStatus` from `@acme/shared` as a _value_,
and that is load-bearing.** It is the only value-level import across the workspace graph, and it is
what makes turbo's `dependsOn: ["^build"]` actually order the builds. Do not "tidy" it into a
type-only import — the graph silently stops being exercised and `@acme/shared` can build after its
consumers.

`@acme/web` imports from `@acme/shared` with `import type` only. That is deliberate: web is ESM,
shared compiles to CommonJS, and keeping it type-only sidesteps interop entirely.

## Conventions

**Adding dependencies** — always from the repo root, targeting the workspace:

```bash
yarn workspace @acme/web add <package>
yarn workspace @acme/api add -D <package>
```

Never `npm install` inside `apps/*`. The workspace root owns the single `yarn.lock`; npm would
create a competing `package-lock.json` and a nested `node_modules`.

Workspace-to-workspace dependencies use `"@acme/shared": "workspace:*"`.

**Types crossing the api/web boundary go in `packages/shared`.** Do not duplicate a response
interface in `apps/api` and again in `apps/web` — that is the mistake this package exists to prevent.

## Gotchas

Each of these has a reason. Changing them without understanding the reason will break something.

**TypeScript is pinned to 5.9.3** via `resolutions`, and must stay there. TypeScript 7 is the
Go-native port; it drops `baseUrl` and `emitDecoratorMetadata`. NestJS dependency injection requires
`emitDecoratorMetadata`, so the API cannot compile under it. Do not upgrade TypeScript.

**Docker dependency changes need no rebuild.** A one-shot `install` service owns `node_modules` in
named volumes and re-runs on every `docker compose up`. After editing any `package.json`, just
`docker compose up` again — no `--build`.

**The `install` service deliberately does not use `--immutable`.** It exists to be able to update
`yarn.lock`. Adding `--immutable` reintroduces a chicken-and-egg where a stale lockfile fails the
build you need in order to fix the lockfile.

**Every workspace needs its own `node_modules` named volume** in `docker-compose.yml`. There are
four today (root, api, web, shared). If you add a workspace, add a volume for it — otherwise the
host's macOS-ARM binaries leak through the bind mount into the Linux container and native modules
crash.

**`dist/` is written to the host.** The whole repo is bind-mounted, so container builds put
`apps/api/dist` and `packages/shared/dist` in your working copy. Both are gitignored, but they will
collide if you also run `yarn build` on the host. Pick one or the other while iterating.

Note `dist` deliberately has **no** volume over it: `nest start --watch` runs with
`deleteOutDir: true`, and `rmdir` on a mount point fails with EBUSY and crash-loops.

**The API has no global prefix.** Routes are `/health`, not `/api/health`. The Vite dev proxy maps
`/api/*` → the API and strips the prefix. Do not add `setGlobalPrefix('api')` — it would double the
prefix through the proxy.

**The first `yarn install` in a freshly scaffolded project re-sorts `yarn.lock`.** Renaming the
workspace packages changes their alphabetical position. It is purely a reordering — no version or
resolution changes — but `yarn install --immutable` fails until a plain `yarn install` has run once.

## Adding an API endpoint

1. If the response is consumed by web, define its type in `packages/shared/src/` and export it from
   `packages/shared/src/index.ts`.
2. Add the route to `apps/api/src/app.controller.ts`, or create a new controller and register it in
   the `controllers` array of `apps/api/src/app.module.ts`.
3. Rebuild shared if you touched it: `yarn build` (or `yarn workspace @acme/shared build`). The API
   imports shared's compiled `dist/`, so an unbuilt change is invisible to it.
4. Verify: `curl localhost:3001/<route>`.

## Adding a web page

1. Create the component in `apps/web/src/`.
2. Fetch through `/api/...` — the Vite proxy forwards it and strips the prefix.
3. Import shared types with `import type { X } from '@acme/shared'`.
4. Style with Tailwind utility classes. `apps/web/src/index.css` is a bare `@import "tailwindcss";`
   — do not add CSS files or a Tailwind config; v4 needs neither.
5. Verify in the browser at `localhost:3000`.

## Intentionally absent

Do **not** add these unless explicitly asked. Their absence is a decision, not an oversight:

- **No database.** The API holds no persistence layer at all. Add one when the project needs it.
- **No ESLint, Prettier, or editorconfig.** Removed on purpose; formatting is not enforced here.
- **No test framework.** Jest was removed. Do not add Jest, Vitest, or test files unprompted.
- **No CI workflows.**
- **No production Dockerfile.** The single `Dockerfile` is a bare dev runtime.
- **No auth, no UI component library, no state management.**

This is a scaffold. It is deliberately minimal so each project adds only what it actually needs.
