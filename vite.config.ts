import {
  defineConfig,
  mergeConfig,
} from 'vite'

import dts from 'vite-plugin-dts'

import {
  join,
  resolve,
} from 'node:path'

import { name } from './package.json'

import basic from './vite.config.basic'

export default mergeConfig(basic, defineConfig({
  build: {
    lib: {
      name,
      formats: ['es', 'cjs'],
      entry: {
        index: resolve(__dirname, './src/index.ts'),
        assertions: resolve(__dirname, './src/assertions.ts'),
        combinators: resolve(__dirname, './src/combinators.ts'),
        predicates: resolve(__dirname, './src/predicates.ts'),
      },
      fileName: (format, entryName) => `${entryName}.${{
        cjs: 'cjs',
        es: 'mjs',
      }[format as 'es' | 'cjs']}`,
    },
    minify: false,
    rollupOptions: {
      output: {
        exports: 'named',
        dir: join(__dirname, '/dist'),
        chunkFileNames: '[name].[format].js',
      },
    },
  },

  plugins: [dts({
    entryRoot: './src',
    exclude: [
      'scripts/**/*.*',
      'tests/**/*.*',
    ],
    insertTypesEntry: true,
    staticImport: true,
  })],
}))
