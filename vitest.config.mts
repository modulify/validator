import * as path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(__dirname, './src/'),
    },
  },
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/**'],
    },
  },
})
