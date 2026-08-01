# acme starter

Boilerplate monorepo: **React (Vite) + NestJS + TypeScript**, wired together with Yarn 4
workspaces and Turborepo.

No database, no external services, no domain code. Clone it, install, run — the web app
shows a single indicator confirming it can reach the API, and that's the whole scaffold.

Everything is namespaced `@acme/*` with the project slug `acme`, so a find-and-replace
makes it yours. This repo is meant to be consumed by a scaffolder
(`npx @org/create-app <project_name>`), which is why there are no post-clone setup steps.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | **22.13+** | `.nvmrc` says `22`; ESLint 10 needs at least 22.13 |
| Corepack | bundled with Node | `corepack enable` (activates Yarn 4) |
| Yarn | 4.18.0 | pinned via `packageManager`, no global install needed |
| Docker | optional | with Compose v2, if you'd rather not install Node at all |

## Quickstart

```bash
nvm use
corepack enable
yarn install
yarn dev
```

Open **http://localhost:3000**. The page calls `/api/health` and shows a green dot if the
backend answered, red if it didn't. That's the whole stack proving itself: the workspace
graph resolved and the Vite proxy reached NestJS.

### Or entirely in Docker

No host Node required — `docker compose up` is the whole workflow:

```bash
docker compose up            # installs deps, then runs both apps
docker compose up            # after a dependency change — no rebuild needed
docker compose down -v       # reset dependencies
```

A one-shot `install` service owns `node_modules` in a named volume and runs to completion
before the apps start. Because the install happens at *run* time rather than inside an image
build, changing a dependency never needs `--build`, and the container can update `yarn.lock`
itself.

**The trade-off:** the containers' `node_modules` lives in a Docker volume, not on disk, so
if you've never run a host `yarn install` your editor has nothing to index. Run one when you
want autocomplete — it's independent of the containers and they won't disturb it. The two
copies coexist: the named volumes shadow the host's inside the containers, so macOS binaries
never reach Linux and the container never writes to your host `node_modules`.

## Ports

| Service | Var | Default | URL |
|---|---|---|---|
| Web (Vite) | `PORT_WEB` | 3000 | http://localhost:3000 |
| API (NestJS) | `PORT_API` | 3001 | http://localhost:3001 |

There's no `.env` file — compose falls back to those defaults when the vars are unset.
Override them in your shell, or add a `.env` and compose will pick it up.

## Endpoints

| Route | Returns |
|---|---|
| `GET /health` | `{"status":"ok","service":"acme-api","timestamp":"..."}` |

Reachable from the browser through the Vite proxy at `/api/*`, which strips the prefix —
the API itself has no global prefix.

## Commands

| Command | What it does |
|---|---|
| `yarn dev` | All workspaces in watch mode via Turborepo |
| `yarn build` | Builds `@acme/shared` first, then both apps |
| `yarn typecheck` | Type-checks every workspace, no emit |
| `yarn lint` / `yarn lint:fix` | ESLint across all three workspaces (fails on warnings) |
| `yarn format` / `yarn format:check` | Prettier over the repo |
| `yarn docker:up` / `:down` / `:logs` | Compose wrappers |
| `yarn docker:reset` | `docker compose down -v` — drops the dependency volumes |

## Layout

```
.
├── apps/
│   ├── api/            @acme/api — NestJS 11
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── app.controller.ts   GET /health
│   └── web/            @acme/web — Vite + React 19 + Tailwind 4
│       └── src/App.tsx             heading + health indicator
├── packages/shared/    @acme/shared — HealthStatus
├── turbo.json          task graph (`build` depends on `^build`)
├── Dockerfile          one bare Node image, shared by every service
└── docker-compose.yml  install (one-shot) + api + web
```

`@acme/shared` is not decorative: `@acme/api` imports `buildHealthStatus` from it as a
*value*, so Turborepo's `dependsOn: ["^build"]` ordering is genuinely exercised. `@acme/web`
imports `HealthStatus` as a type.

## Adding a database

There's no data layer at all — add one when the project needs it. Typically: a Nest module
wrapping your client of choice (Prisma, TypeORM, Drizzle), then a `db` service in
`docker-compose.yml` with a healthcheck and
`depends_on: { db: { condition: service_healthy } }` on the api service so it doesn't boot
against a database that isn't accepting connections yet.

Once there's something that can fail, widen `HealthStatus.status` beyond the `'ok'` literal
and have `/health` return 503 when the check fails — right now the API has no failure mode,
so the red dot only means "couldn't reach the API at all".

## Renaming for a new project

Two tokens, both chosen to be greppable:

```bash
grep -rl '@acme' . --exclude-dir=node_modules --exclude-dir=.git | xargs sed -i '' 's/@acme/@yourorg/g'
grep -rl 'acme'  . --exclude-dir=node_modules --exclude-dir=.git | xargs sed -i '' 's/acme/yourproject/g'
```

Then `yarn install` to refresh the lockfile.

## Notes and gotchas

### Adding dependencies

From the repo root, targeting the workspace:

```bash
yarn workspace @acme/web add <package>
```

Never `npm install` inside `apps/*` — the workspace root owns the single `yarn.lock`.

Working in Docker, that's the whole story: `docker compose up` re-runs the `install` service,
which picks up the change and updates the lockfile. No `--build`. Working on the host, run
`yarn install` as usual.

### How the Docker setup is put together

One `Dockerfile` at the root, shared by all three services. It's deliberately bare — Node,
corepack, a workdir — because source comes from a bind mount of the whole repo and
`node_modules` comes from named volumes. Nothing about the image depends on your code, so it
essentially never needs rebuilding.

The `install` service owns those volumes. It runs `yarn install` (not `--immutable`) plus the
`@acme/shared` build, and the apps declare
`depends_on: { install: { condition: service_completed_successfully } }` so they never start
against a half-populated `node_modules`.

### node_modules and Apple Silicon

Every workspace's `node_modules` path gets its own named volume, which shadows the host's copy
inside the container. esbuild and rollup ship platform-specific binaries and the macOS-ARM ones
must never reach the Linux containers. If you add a workspace, add a volume for it — a missing
path silently lets the host's copy through.

### dist/ lands on the host

Because the whole repo is bind-mounted, container builds write `apps/api/dist` and
`packages/shared/dist` to your working copy. Both are gitignored, but they will collide if you
also run `yarn build` on the host — pick one or the other while iterating.

`dist` deliberately has *no* volume over it: `nest start --watch` runs with
`deleteOutDir: true`, and `rmdir` on a mount point fails with EBUSY and crash-loops. As a plain
directory inside the bind mount it works fine.

### TypeScript is pinned to 5.9.3

Deliberate, and enforced via `resolutions`. TypeScript 7 is the Go-native port and drops both
`baseUrl` and `emitDecoratorMetadata`; NestJS's dependency injection requires the latter, so
the API cannot compile under it. Revisit when NestJS supports TS 7.

### Linting and formatting

ESLint 10 (flat config in `eslint.config.mjs`) and Prettier, both at the root — one config covering
all three workspaces rather than three copies.

```bash
yarn lint         # ESLint, fails on warnings
yarn lint:fix     # ...applying every auto-fix
yarn format       # Prettier
```

Prettier owns formatting, ESLint owns correctness. `.prettierrc` is deliberately three settings:
`semi: false`, `singleQuote: true`, `printWidth: 100`. Markdown and `docker-compose.yml` are in
`.prettierignore` — the prose is hand-wrapped and Prettier only adds diff noise to it.

`apps/web/src` additionally gets `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`, which
catch conditional hook calls and dependency-array mistakes that `tsc` accepts happily.

### Formatting happens automatically in Claude Code

`.claude/settings.json` registers a `PostToolUse` hook that runs Prettier and `eslint --fix` on each
file as it's written, so agent-generated code lands formatted without anyone asking. Claude Code
prompts you to approve the hook the first time you open the project — that's expected, and the script
it runs is `.claude/hooks/format.mjs`, ~50 lines with no dependencies.

The hook is silent and never blocks. It cannot substitute for `yarn lint`: anything `--fix` can't
repair is only reported there. It also exits quietly when `node_modules` is missing, so a fresh clone
doesn't error on every edit.

Other AI tools (Codex, Cursor, Copilot, Gemini CLI, Aider) read `AGENTS.md`, which instructs them to
run `yarn lint:fix && yarn format` before finishing.

### What's intentionally missing

No database, no `.editorconfig`, husky, lint-staged, CI workflows, test framework, auth, or
production Dockerfiles. Note that without CI nothing actually *blocks* unformatted or lint-failing
code — the hook and `AGENTS.md` are both advisory. This is the barebones structural template; those
get layered on per project. `tsconfig.base.json` is deliberately minimal for the same reason — it
holds only settings that don't conflict between Nest's and Vite's very different compiler setups.
