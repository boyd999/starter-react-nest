// Adds jest-dom's matchers (toBeInTheDocument, toHaveTextContent, …) to Vitest's
// expect, and unmounts React trees between tests so one test's DOM can't leak
// into the next.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
