import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier/flat'

// One flat config for all three workspaces. There's nothing per-workspace to
// orchestrate, so this isn't a turbo task — see AGENTS.md.
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**'] },

  js.configs.recommended,
  // Not `recommendedTypeChecked`: type errors are `yarn typecheck`'s job, and
  // wiring projectService across three unrelated tsconfigs costs more than it
  // catches here.
  tseslint.configs.recommended,

  // Browser code.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
  },

  // Node code: the API, the shared package, web's own build config, and the
  // tooling at the root and in .claude/hooks. `**/*.mjs` rather than `*.mjs` —
  // a single star doesn't cross a directory separator, so the bare form misses
  // .claude/hooks/format.mjs and it fails with `'process' is not defined`.
  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts', 'apps/web/vite.config.ts', '**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // Must stay last: switches off every rule that would fight Prettier.
  prettier,
)
