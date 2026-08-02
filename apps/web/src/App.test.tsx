import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// App fetches on mount, so every test drives it through global.fetch. The three
// states it can land in are the keys of its INDICATOR map.
function mockFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal('fetch', vi.fn(impl))
}

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('shows the API as operational once /health answers', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'acme-api', timestamp: '' }),
      }),
    )

    render(<App />)

    // The checking state renders synchronously, before the fetch settles.
    expect(screen.getByText('Checking API…')).toBeInTheDocument()

    expect(await screen.findByText('API operational')).toBeInTheDocument()
    expect(screen.getByText('acme-api')).toBeInTheDocument()
  })

  it('shows the API as unreachable when the request rejects', async () => {
    mockFetch(() => Promise.reject(new Error('connection refused')))

    render(<App />)

    expect(await screen.findByText('API unreachable')).toBeInTheDocument()
  })

  it('treats a non-2xx response as unreachable', async () => {
    // A reachable API is not the same as a healthy one — App throws on !res.ok.
    mockFetch(() => Promise.resolve({ ok: false, status: 503 }))

    render(<App />)

    expect(await screen.findByText('API unreachable')).toBeInTheDocument()
  })
})
