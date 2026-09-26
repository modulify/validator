import {
  defineConfig,
  mergeConfig,
} from 'vite'

import dts from 'unplugin-dts/vite'

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

import packageJson from './package.json' with { type: 'json' }

import basic from './vite.config.basic.ts'

const writeModuleDeclarations = async () => {
  const outputDirectory = resolve(import.meta.dirname, 'dist')
  await cp(resolve(import.meta.dirname, 'types'), join(outputDirectory, 'types'), { recursive: true })
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
      name: packageJson.name,
      entry: {
        assert: resolve(import.meta.dirname, './src/assert.ts'),
        assertions: resolve(import.meta.dirname, './src/assertions.ts'),
        combinators: resolve(import.meta.dirname, './src/combinators.ts'),
        'json-schema': resolve(import.meta.dirname, './src/json-schema.ts'),
        metadata: resolve(import.meta.dirname, './src/metadata.ts'),
        predicates: resolve(import.meta.dirname, './src/predicates.ts'),
        index: resolve(import.meta.dirname, './src/index.ts'),
      },
      fileName: (format, entryName) => `${entryName}.${{
        cjs: 'cjs',
        es: 'mjs',
      }[format as 'es' | 'cjs']}`,
    },
    minify: false,
    rolldownOptions: {
      output: (['es', 'cjs'] as const).map(format => ({
        format,
        exports: 'named',
        dir: resolve(import.meta.dirname, 'dist'),
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
