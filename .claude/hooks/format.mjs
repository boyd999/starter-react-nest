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
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTENSIONS = /\.(m?[jt]sx?|cjs|cts|json|jsonc|css|html)$/

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

tryRun('prettier', ['--write', '--ignore-unknown', abs])
tryRun('eslint', ['--fix', '--no-warn-ignored', abs])

process.exit(0)
