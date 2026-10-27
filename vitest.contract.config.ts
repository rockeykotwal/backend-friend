import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/contract/**/*.test.ts'],
    testTimeout: 60000,   // real API calls can take up to 30s
    hookTimeout: 10000,
    reporters: ['verbose'],
  },
})
