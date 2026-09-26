import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const consumerRoot = await mkdtemp(join(tmpdir(), 'validator-consumer-'))
const run = (command, args, cwd = consumerRoot) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const runtimeChecks = `
for (const [name, assertion] of Object.entries(assertions)) {
  assert.equal(root[name], assertion, name + ' differs between root and assertions')
}
assert.equal(typeof combinators.shape, 'function')
assert.equal(predicates.isShape({ name: [predicates.isString, false] })({}), true)
assert.equal(predicates.isShape({ name: [predicates.isString, false] })({ name: 2 }), false)
assert.equal(root.isFiniteNumber.check(Infinity), false)
assert.equal(root.isInteger.check(1.5), false)
assert.equal(root.isSafeInteger.check(Number.MAX_SAFE_INTEGER + 1), false)
assert.equal(root.isValidDate.check(new Date('invalid')), false)
assert.equal(root.isError.check(new TypeError('error')), true)
assert.equal(root.isRegExp.check(/pattern/), true)
assert.equal(root.isPromiseLike.check({ then() {} }), true)
assert.equal(root.validate.sync(4, [root.isInteger, root.multipleOf(2)])[0], true)
assert.throws(() => root.validate.sync(['a'], [root.each(root.isString), root.hasLength({ min: 1 })]), /preceding guard/)
assert.deepEqual(jsonSchema.toJsonSchema(root.isSafeInteger), {
  type: 'integer', minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER,
})
assert.throws(() => jsonSchema.toJsonSchema(root.isRegExp, { mode: 'strict' }), jsonSchema.JsonSchemaExportError)
`

const typeChecks = `
import { each, hasLength, hasValue, isDefined, isInteger, isPromiseLike, isString, matches, multipleOf, shape, validate } from '@modulify/validator'
import type { InferConstraint, KnownViolationSubject, ValidationResult, ViolationCodeEntry } from '@modulify/validator'
import { isSafeInteger } from '@modulify/validator/assertions'
import { optional } from '@modulify/validator/combinators'
import { isShape, isString as isStringPredicate } from '@modulify/validator/predicates'
import { toJsonSchema } from '@modulify/validator/json-schema'

declare module '@modulify/validator' {
  interface ViolationCodeRegistry {
    'consumer.named': ViolationCodeEntry<'assertion', 'consumer', readonly [name: string]>
    'consumer.locked': ViolationCodeEntry<'validator', 'shape', readonly [retryAt: number]>
    'consumer.recovery': ViolationCodeEntry<'validator', 'shape', readonly [url: string]>
  }
}
const named: KnownViolationSubject<'consumer.named'> = { kind: 'assertion', name: 'consumer', code: 'consumer.named', args: ['value'] }
// @ts-expect-error registry augmentation preserves the argument type
const invalidNamed: KnownViolationSubject<'consumer.named'> = { kind: 'assertion', name: 'consumer', code: 'consumer.named', args: [2] }

type AuthIssue = KnownViolationSubject<'consumer.locked' | 'consumer.recovery'>
// @ts-expect-error union codes retain their own argument tuples
const mixedAuthIssue: AuthIssue = { kind: 'validator', name: 'shape', code: 'consumer.locked', args: ['/recover'] }
const auth = shape({ login: isString })
// @ts-expect-error inferred registered refinement requires arguments
auth.refine.sync(() => ({ code: 'consumer.locked' }))
// @ts-expect-error inferred async refinement checks argument types
auth.refine(async () => ({ code: 'consumer.locked', args: ['later'] }))
const authResult = validate.sync({ login: '' }, auth.refine.sync(value => value.login
  ? null
  : { code: 'consumer.locked', args: [60] }))
if (!authResult[0]) {
  for (const issue of authResult[2]) {
    if (issue.violates.code === 'consumer.locked') {
      const retryAt: number = issue.violates.args[0]
      void retryAt
    }
  }
}
void mixedAuthIssue

const result: ValidationResult<number> = validate.sync(4, [isInteger, multipleOf(2)])
const safeResult: ValidationResult<number> = validate.sync(4, [isSafeInteger, hasValue({ min: 0 })])
const profile = shape({ name: [isDefined, isString], nickname: optional(isString) })
const profileResult = validate.sync({}, profile)
if (profileResult[0]) profileResult[1].name.toUpperCase()
toJsonSchema(profile)
const predicate = isShape({ name: isStringPredicate, nickname: [isStringPredicate, false] })
const value: unknown = {}
if (predicate(value)) { value.name.toUpperCase(); value.nickname?.toUpperCase() }
const promised: InferConstraint<typeof isPromiseLike> = Promise.resolve('value')
// @ts-expect-error validator does not establish an assertion domain
validate.sync(['a'], [each(isString), hasLength({ min: 1 })])
// @ts-expect-error refinement input must match the preceding guard
matches.sync(4, [isInteger, hasLength({ min: 1 })])
void result; void safeResult; void promised; void named; void invalidNamed
`

try {
  const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--cache', join(consumerRoot, 'cache'), '--pack-destination', consumerRoot], projectRoot))
  const archive = join(consumerRoot, packed[0].filename)
  await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--cache', join(consumerRoot, 'cache'), archive])

  const installedDist = join(consumerRoot, 'node_modules/@modulify/validator/dist')
  const runtimeFiles = (await readdir(installedDist)).filter(file => /\.(mjs|cjs)$/.test(file))
  assert.equal(runtimeFiles.some(file => /-[\w-]{8}\.(mjs|cjs)$/.test(file)), false,
    'The package contains hashed runtime chunks')

  for (const format of ['mjs', 'cjs']) {
    const rootSource = await readFile(join(installedDist, `index.${format}`), 'utf8')
    const assertionsSource = await readFile(join(installedDist, `assertions.${format}`), 'utf8')
    assert.ok(rootSource.includes(`./assertions.${format}`), 'Root must share the public assertions module')
    assert.ok(assertionsSource.includes(`./predicates.${format}`), 'Assertions must use the public predicates module directly')

    const imports = format === 'mjs'
      ? `import assert from 'node:assert/strict'
import * as root from '@modulify/validator'
import * as assertions from '@modulify/validator/assertions'
import * as combinators from '@modulify/validator/combinators'
import * as predicates from '@modulify/validator/predicates'
import * as jsonSchema from '@modulify/validator/json-schema'`
      : `const assert = require('node:assert/strict')
const root = require('@modulify/validator')
const assertions = require('@modulify/validator/assertions')
const combinators = require('@modulify/validator/combinators')
const predicates = require('@modulify/validator/predicates')
const jsonSchema = require('@modulify/validator/json-schema')`
    const file = join(consumerRoot, `runtime.${format}`)
    await writeFile(file, imports + runtimeChecks)
    run(process.execPath, [file])
  }

  const tsc = join(projectRoot, 'node_modules/typescript/bin/tsc')
  for (const format of ['mts', 'cts']) {
    const file = join(consumerRoot, `consumer.${format}`)
    await writeFile(file, typeChecks)
    run(process.execPath, [tsc, '--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', file])
  }
  run(process.execPath, [tsc, '--noEmit', '--strict', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'Bundler', join(consumerRoot, 'consumer.mts')])

  await writeFile(join(consumerRoot, 'entry.mjs'), 'import { isInteger } from \'@modulify/validator\'; export const check = value => isInteger.check(value)\n')
  await build({
    configFile: false,
    root: consumerRoot,
    logLevel: 'silent',
    build: {
      minify: false,
      lib: { entry: join(consumerRoot, 'entry.mjs'), formats: ['es'], fileName: () => 'consumer.mjs' },
    },
  })
  const bundled = await readFile(join(consumerRoot, 'dist/consumer.mjs'), 'utf8')
  for (const unused of ['isPromiseLike', 'collectViolations', 'shape.fields.mismatch', 'type.error']) {
    assert.equal(bundled.includes(unused), false, `Unused ${unused} remained in the consumer bundle`)
  }
  await writeFile(join(consumerRoot, 'bundle-check.mjs'), 'import assert from \'node:assert/strict\'; import { check } from \'./dist/consumer.mjs\'; assert.equal(check(1), true); assert.equal(check(1.5), false)\n')
  run(process.execPath, [join(consumerRoot, 'bundle-check.mjs')])
  console.log(`Packed consumer checks passed: ESM, CJS, strict NodeNext/Bundler, tree shaking (${Buffer.byteLength(bundled)} bytes).`)
} catch (error) {
  console.error([error.message, error.stdout?.toString(), error.stderr?.toString()].filter(Boolean).join('\n'))
  process.exitCode = 1
} finally {
  await rm(consumerRoot, { recursive: true, force: true })
}
