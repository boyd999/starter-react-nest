#!/usr/bin/env node
// Claude Code Stop hook: runs the test suite when the agent finishes a turn.
//
// Wired up in .claude/settings.json. Unlike format.mjs — which is silent and
// never blocks — this one BLOCKS: on failure it writes the runner output to
// stderr and exits 2, which tells Claude Code to keep the conversation going
// and hand that output back so the agent can fix what it broke.
//
// Node rather than bash+jq: jq isn't guaranteed on a fresh clone, node is.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { delimiter, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = resolve(
  process.env.CLAUDE_PROJECT_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
)

function payload() {
  try {
    return JSON.parse(readFileSync(0, 'utf8')) ?? {}
  } catch {
    return {}
  }
}

// THE loop guard. Exiting 2 stops Claude from stopping, so without this a test
// the agent can't fix would bounce between hook and model forever. Claude Code
// sets this flag on the re-entrant call; we run once and then let the turn end.
if (payload().stop_hook_active) process.exit(0)

// No install yet (fresh clone, or `docker compose down -v`). Erroring on every
// turn would be far more disruptive than skipping the run.
const turbo = resolve(projectDir, 'node_modules/.bin/turbo')
if (!existsSync(turbo)) process.exit(0)

// turbo caches per workspace, so untouched packages return instantly, and the
// `test` task's dependsOn: ["^build"] means @acme/shared is built first —
// @acme/api imports it as a value, from dist/.
//
// The root node_modules/.bin has to go on PATH first. turbo shells out to
// `yarn run test` per workspace, and picks up whatever `yarn` is on PATH — on a
// machine with nvm that is Yarn 1, not the corepack-pinned Yarn 4, and Yarn 1
// only adds the *workspace's* .bin. vitest is hoisted to the root, so without
// this the hook dies with `command not found: vitest` while `yarn test` from a
// terminal works fine.
const result = spawnSync(turbo, ['run', 'test'], {
  cwd: projectDir,
  encoding: 'utf8',
  stdio: 'pipe',
  env: {
    ...process.env,
    PATH: [resolve(projectDir, 'node_modules/.bin'), process.env.PATH].join(delimiter),
  },
})

if (result.status === 0) process.exit(0)

// Anything non-zero: hand the output back. stderr is what Claude Code surfaces
// to the model as a system reminder.
process.stderr.write(
  'Tests failed. Fix them before finishing.\n\n' + (result.stdout ?? '') + (result.stderr ?? ''),
)
process.exit(2)
