---
name: add-api-endpoint
description: Add a new HTTP endpoint to the NestJS API following this project's conventions. Use when asked to add a route, endpoint, controller, or API method to apps/api.
---

# Add an API endpoint

Follow these steps in order. Read `AGENTS.md` first if you haven't.

## 1. Decide where the response type lives

**If web will consume this response, the type goes in `packages/shared`** — never duplicated in
`apps/api`. That is the entire reason the shared package exists.

Add it to `packages/shared/src/health.ts` (or a new file alongside it), then export it from
`packages/shared/src/index.ts`:

```ts
export type { HealthStatus, YourNewType } from './health'
```

If the response is internal to the API and web will never see it, define it in `apps/api/src/`
and skip this step.

## 2. Add the route

For a small addition, extend `apps/api/src/app.controller.ts`:

```ts
@Get('your-route')
yourRoute(): YourNewType {
  return /* ... */;
}
```

For anything with its own concern, create `apps/api/src/<feature>.controller.ts` and register it in
the `controllers` array of `apps/api/src/app.module.ts`. Providers go in the `providers` array of
the same module — there are no feature modules in this scaffold yet, and adding one is fine if the
feature warrants it.

Do **not** add `setGlobalPrefix`. Routes are bare (`/health`, not `/api/health`); the Vite proxy
strips `/api` on the way through.

## 3. Rebuild shared if you touched it

```bash
yarn build
```

The API imports `@acme/shared` from its compiled `dist/`, so an unbuilt change to the shared package
is invisible to the running API. This is the most common reason a new endpoint returns stale or
undefined data.

## 4. Verify

```bash
curl -i localhost:3001/your-route
```

Then:

```bash
yarn lint && yarn typecheck
```

`typecheck` catches a shared type that was defined but not exported. `lint` catches what the
format-on-write hook can't auto-fix — the hook is silent by design, so a clean-looking file is not a
lint-clean file.

If the API isn't running: `yarn dev` on the host, or `docker compose up`.

## Reminders

- Keep the value import of `buildHealthStatus` in `app.controller.ts` as a value import. It is what
  makes turbo's build ordering load-bearing.
- Don't add a test file. This scaffold has no test framework on purpose.
- Don't add a validation library (class-validator, zod) unless asked.
