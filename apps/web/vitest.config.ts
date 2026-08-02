import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.ts on purpose. Vitest prefers this file when both
// exist, which keeps vite.config.ts about the dev server and the /api proxy —
// neither of which a unit test should be dragging in. Tailwind is omitted here
// for the same reason: class names are strings to jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
