import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import basic from './vite.config.basic'

export default mergeConfig(basic, defineConfig({
  test: {
    include: [
      '**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
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
