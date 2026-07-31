import { useEffect, useState } from 'react'
import type { HealthStatus } from '@acme/shared'

type Status = 'checking' | 'ok' | 'down'

const INDICATOR: Record<Status, { dot: string; label: string }> = {
  checking: { dot: 'bg-gray-400', label: 'Checking API…' },
  ok: { dot: 'bg-green-500', label: 'API operational' },
  down: { dot: 'bg-red-500', label: 'API unreachable' },
}

function App() {
  const [status, setStatus] = useState<Status>('checking')
  const [service, setService] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        // A non-2xx is still a reachable API, but not a healthy one.
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<HealthStatus>
      })
      .then((health) => {
        setService(health.service)
        setStatus('ok')
      })
      .catch(() => setStatus('down'))
  }, [])

  const { dot, label } = INDICATOR[status]

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">React + NestJS starter</h1>

      <div className="mt-6 flex items-center gap-3">
        <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} />
        <span className="text-sm">{label}</span>
      </div>

      {service && <p className="mt-2 text-xs text-gray-500">{service}</p>}
    </main>
  )
}

export default App
