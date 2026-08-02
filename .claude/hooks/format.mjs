#!/usr/bin/env node
// Claude Code PostToolUse hook: formats the one file that just changed.
//
// Wired up in .claude/settings.json on Edit|Write. Reads the hook payload on
// stdin, pulls tool_input.file_path, and runs prettier --write then
// eslint --fix on that path.
//
// Node rather than bash+jq: jq isn't guaranteed on a fresh clone, node is.
//
// It exits 0 in every failure case on purpose. A hook that errors would fire
// on every single edit — including in a clone where nobody has run
// `yarn install` yet — and that is far more disruptive than an unformatted
// file. `yarn lint` remains the thing that actually reports problems.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTENSIONS = /\.(m?[jt]sx?|cjs|cts|json|jsonc|css|html)$/

// Read and cleared by the Stop hook (test.mjs). This hook is the only thing
// that knows a source file actually changed, so it's what arms the test run —
// otherwise the suite fires on every turn, including ones that only asked a
// question or invoked a read-only skill.
const MARKER = 'node_modules/.cache/claude-tests-pending'

const projectDir = resolve(
  process.env.CLAUDE_PROJECT_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..'),
)

function editedFile() {
  try {
    // fd 0 — the payload is small and already buffered by the time we run.
    return JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.file_path ?? ''
  } catch {
    return ''
  }
}

function tryRun(bin, args) {
  const executable = resolve(projectDir, 'node_modules/.bin', bin)
  if (!existsSync(executable)) return // deps not installed
  spawnSync(executable, args, { cwd: projectDir, stdio: 'ignore' })
}

const file = editedFile()
if (!file || !EXTENSIONS.test(file)) process.exit(0)

// Only touch files inside this project — an edit elsewhere shouldn't be
// reformatted with this repo's config.
const abs = resolve(file)
if (!abs.startsWith(projectDir)) process.exit(0)
if (!existsSync(abs) || !statSync(abs).isFile()) process.exit(0)

// Swallowing everything is deliberate: this hook's contract is that it is
// silent and never fails, and a marker it couldn't write must not change that.
// The cost of failing here is a skipped test run, not a broken edit.
try {
  const marker = resolve(projectDir, MARKER)
  mkdirSync(dirname(marker), { recursive: true })
  writeFileSync(marker, '')
} catch {
  // ignored
}

tryRun('prettier', ['--write', '--ignore-unknown', abs])
tryRun('eslint', ['--fix', '--no-warn-ignored', abs])

process.exit(0)
