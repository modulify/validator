import {
  defineConfig,
  mergeConfig,
} from 'vitest/config'

import basic from './vite.config.basic.ts'

export default mergeConfig(basic, defineConfig({
  test: {
    include: [
      '**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**'],
      reporter: [
        'text',
        'html',
        'json',
        'lcovonly',
      ],
    },
    typecheck: {
      checker: 'tsc',
      include: ['tests/**/*.test-d.ts'],
    },
  },
}))
