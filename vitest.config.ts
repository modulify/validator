import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import basic from './vite.config.basic'

export default mergeConfig(basic, defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/**'],
    },
    typecheck: {
      checker: 'tsc',
      include: ['tests/**/*.test-d.ts'],
    },
  },
}))
