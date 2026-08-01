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
| `yarn lint` | ESLint across all three workspaces. Fails on warnings. |
| `yarn lint:fix` | Same, applying every auto-fix ESLint can. |
| `yarn format` | Prettier over the repo. |
| `yarn format:check` | Prettier in check mode — reports, changes nothing. |
| `docker compose up` | Runs everything in containers. No host Node needed. |

**Before you finish, run `yarn lint:fix && yarn format`, then `yarn build` and `yarn typecheck`.**
There is no test suite (see *Intentionally absent*), so those are the only automated safety net.

Claude Code users get formatting for free — a `PostToolUse` hook in `.claude/settings.json` runs
Prettier and `eslint --fix` on each file as it's written. It is deliberately silent and never blocks,
so it cannot substitute for `yarn lint`: anything `--fix` can't repair is only reported there.

## Commit and PR conventions

`.claude/settings.json` declares the `smartshore-tools` marketplace
([boyd999/claude-plugins](https://github.com/boyd999/claude-plugins)) and enables its `smartshore`
plugin, so Claude Code offers to install it the first time you trust this folder. It provides:

- `/smartshore:commit-message` — one Conventional Commits line from the staged diff. It suggests
  only; it never runs `git commit`.
- `/smartshore:pr-description` — a PR description in Title / Description / Notes format.

Both are advisory, like everything else in this file. The plugin is shared across every project, so
fix a convention there rather than restating it here — a copy in this repo is a copy that drifts.

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

## Code style

**Prettier owns formatting, ESLint owns correctness.** Don't blur the line: no stylistic ESLint rules,
no formatting arguments in code review.

`.prettierrc` is three settings — `semi: false`, `singleQuote: true`, `printWidth: 100`. The
no-semicolons choice matched `apps/web`; `apps/api` and `packages/shared` were reformatted to suit.

Two things in the config are load-bearing:

- **`eslint-config-prettier` must stay last** in `eslint.config.mjs`. Its whole job is switching off
  rules that would fight Prettier, and a config appended after it re-enables them.
- **`eslint-plugin-react-refresh` 0.5.x exports differ from every example you'll find online.** It's a
  *named* export and the configs are *functions*: `import { reactRefresh } from …` then
  `reactRefresh.configs.vite()`. The default-export/plain-object form is from 0.4.x and throws.

Rules are the non-type-checked recommended sets — `js.configs.recommended`,
`tseslint.configs.recommended`, plus react-hooks and react-refresh for `apps/web/src`. Type-aware
rules (`recommendedTypeChecked`) are not enabled: `yarn typecheck` already covers types, and wiring
`projectService` across three unrelated tsconfigs costs more than it catches at this size.

**Lint is a root script, not a turbo task.** One flat config covers all three workspaces, so there's
nothing to orchestrate and ESLint finishes in about a second. If the repo grows enough that it
doesn't, give each workspace its own `lint` script and add a turbo task — that's the upgrade path.

## Gotchas

Each of these has a reason. Changing them without understanding the reason will break something.

**Node must be ≥ 22.13.** ESLint 10 declares `^20.19.0 || ^22.13.0 || >=24`. `.nvmrc` says `22`, which
nvm resolves to your newest installed 22.x — if that's older than 22.13, `yarn lint` won't run.

**Markdown and `docker-compose.yml` are in `.prettierignore`.** The prose is hand-wrapped at 100
columns and reviewed by humans; Prettier only pads tables and rewrites `*emphasis*` as `_emphasis_`,
which is diff noise in exactly the files people read. Compose is deliberately double-quoted and
`singleQuote` would rewrite every port mapping for nothing.

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
- **No `.editorconfig`.** Prettier is the single source of formatting truth; a second one drifts.
- **No husky or lint-staged.** No git hooks, no `prepare` script.
- **No type-checked ESLint rules.** See *Code style* for why.
- **No test framework.** Jest was removed. Do not add Jest, Vitest, or test files unprompted.
- **No CI workflows.** Nothing currently *blocks* unformatted or lint-failing code — the hook and
  this file are both advisory. Worth revisiting per project.
- **No production Dockerfile.** The single `Dockerfile` is a bare dev runtime.
- **No auth, no UI component library, no state management.**

This is a scaffold. It is deliberately minimal so each project adds only what it actually needs.
