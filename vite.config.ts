import {
  defineConfig,
  mergeConfig,
} from 'vite'

import dts from 'vite-plugin-dts'

import {
  join,
  resolve,
} from 'node:path'
import {
  cp,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises'

import { name } from './package.json'

import basic from './vite.config.basic'

const writeModuleDeclarations = async () => {
  const outputDirectory = resolve(__dirname, 'dist')
  await cp(resolve(__dirname, 'types'), join(outputDirectory, 'types'), { recursive: true })
  const files = (await readdir(outputDirectory, { recursive: true })).filter(file => file.endsWith('.d.ts'))

  for (const file of files) {
    const source = await readFile(join(outputDirectory, file), 'utf8')

    for (const [declarationExtension, moduleExtension] of [
      ['.d.ts', '.js'],
      ['.d.mts', '.mjs'],
      ['.d.cts', '.cjs'],
    ]) {
      const content = source.replace(/(from\s+|import\()(['"])(\.[^'"]+)\2/g, (_, prefix, quote, specifier: string) => {
        const target = specifier === '../types'
          ? './types/index'
          : specifier.replace(/^\.\.\/types\//, './types/')

        return `${prefix}${quote}${target.replace(/\.(?:js|mjs|cjs)$/, '')}${moduleExtension}${quote}`
      })
      await writeFile(join(outputDirectory, file.replace(/\.d\.ts$/, declarationExtension)), content)
    }
  }
}

export default mergeConfig(basic, defineConfig({
  build: {
    lib: {
      name,
      entry: {
        assert: resolve(__dirname, './src/assert.ts'),
        assertions: resolve(__dirname, './src/assertions.ts'),
        combinators: resolve(__dirname, './src/combinators.ts'),
        'json-schema': resolve(__dirname, './src/json-schema.ts'),
        metadata: resolve(__dirname, './src/metadata.ts'),
        predicates: resolve(__dirname, './src/predicates.ts'),
        index: resolve(__dirname, './src/index.ts'),
      },
      fileName: (format, entryName) => `${entryName}.${{
        cjs: 'cjs',
        es: 'mjs',
      }[format as 'es' | 'cjs']}`,
    },
    minify: false,
    rollupOptions: {
      output: (['es', 'cjs'] as const).map(format => ({
        format,
        exports: 'named',
        dir: resolve(__dirname, 'dist'),
        chunkFileNames: `[name]-[hash].${format === 'es' ? 'mjs' : 'cjs'}`,
      })),
    },
  },

  plugins: [dts({
    entryRoot: './src',
    exclude: [
      'scripts/**/*.*',
      'tests/**/*.*',
      'vite.config*.ts',
      'vitest.config.ts',
    ],
    insertTypesEntry: true,
    staticImport: true,
    afterBuild: writeModuleDeclarations,
  })],
}))
