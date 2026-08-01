---
name: add-web-page
description: Add a page or component to the React frontend following this project's conventions. Use when asked to add a page, view, screen, route, or component to apps/web.
---

# Add a web page

Follow these steps in order. Read `AGENTS.md` first if you haven't.

## 1. Create the component

Put it in `apps/web/src/`. Follow the shape of `App.tsx`: a function component, default export,
typed state.

## 2. Talk to the API through `/api`

```ts
const res = await fetch('/api/your-route')
```

The Vite dev proxy (`apps/web/vite.config.ts`) forwards `/api/*` to the API and **strips the
prefix**, so `/api/your-route` hits `GET /your-route`. Never hardcode `http://localhost:3001` — it
breaks inside Docker, where the API is reachable as `http://api:3001`.

Handle the failure case. `App.tsx` treats both a rejected fetch and a non-`ok` response as failure:

```ts
if (!res.ok) throw new Error(`HTTP ${res.status}`)
```

## 3. Import shared types as types

```ts
import type { HealthStatus } from '@acme/shared'
```

`import type`, not a value import. Web is ESM and `@acme/shared` compiles to CommonJS — keeping it
type-only sidesteps the interop entirely. If you need a shared _value_ in web, say so rather than
switching to a runtime import, because that's a real decision with consequences.

## 4. Style with Tailwind utilities only

`apps/web/src/index.css` is a single `@import "tailwindcss";` and that's deliberate.

- Do **not** create `.css` files
- Do **not** add `tailwind.config.js` — Tailwind 4 doesn't need one
- Do **not** add a UI component library unless asked

Use utility classes directly in JSX, as `App.tsx` does.

## 5. Verify

```bash
yarn lint && yarn typecheck
```

`lint` matters here: `apps/web/src` gets the react-hooks ruleset, which catches conditional hook
calls and bad dependency arrays that typecheck happily accepts. The format-on-write hook is silent
and only auto-fixes, so it won't tell you about these.

Then look at it: `yarn dev` (or `docker compose up`) and open `localhost:3000`. Confirm the data
actually renders — a type-checking page that renders nothing is a common miss.

## Reminders

- There's no router in this scaffold. If the page needs its own URL, adding `react-router` is a real
  dependency decision — ask first.
- No test files. This scaffold has no test framework on purpose.
