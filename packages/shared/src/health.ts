/**
 * The contract for GET /health, shared by the API that produces it and the web
 * app that consumes it. Replace with real domain types per project.
 */
export interface HealthStatus {
  status: 'ok'
  service: string
  timestamp: string
}

/**
 * Imported as a value by @acme/api — the one value-level import across the
 * workspace, which is what keeps turbo's `^build` ordering load-bearing.
 */
export function buildHealthStatus(service = 'acme-api'): HealthStatus {
  return {
    status: 'ok',
    service,
    timestamp: new Date().toISOString(),
  }
}
