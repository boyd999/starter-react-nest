import { describe, expect, it } from 'vitest'
import { buildHealthStatus } from './health'

describe('buildHealthStatus', () => {
  it('reports ok with the default service name', () => {
    const health = buildHealthStatus()

    expect(health.status).toBe('ok')
    // `acme` is the placeholder create-scaffold rewrites to the project name.
    // Keep it literal here so the rename walk finds it.
    expect(health.service).toBe('acme-api')
  })

  it('honours a caller-supplied service name', () => {
    expect(buildHealthStatus('worker').service).toBe('worker')
  })

  it('stamps a parseable ISO timestamp', () => {
    const { timestamp } = buildHealthStatus()

    expect(timestamp).toBe(new Date(timestamp).toISOString())
  })
})
