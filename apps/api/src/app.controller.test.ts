import { describe, expect, it } from 'vitest'
import { AppController } from './app.controller'

// Instantiated directly rather than through Test.createTestingModule(). The
// controller takes no constructor arguments, so there is nothing for Nest's DI
// container to resolve — and going through it would need emitDecoratorMetadata,
// which Vitest's esbuild transform drops. See AGENTS.md → Testing.
describe('AppController', () => {
  it('returns a healthy status from GET /health', () => {
    const health = new AppController().health()

    expect(health.status).toBe('ok')
    expect(health.service).toBe('acme-api')
    expect(typeof health.timestamp).toBe('string')
  })
})
