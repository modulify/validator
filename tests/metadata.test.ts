import type { Validator } from '~types'

import {
  describe as suite,
  expect,
  test,
} from 'vitest'

import type { Assertion } from '~types'

import {
  assert,
  custom,
  describe as describeConstraint,
  discriminatedUnion,
  each,
  exact,
  isNumber,
  isString,
  meta,
  optional,
  record,
  refine,
  shape,
  tuple,
  union,
  validate,
} from '@/index'
import {
  checkRefinementAssertion,
  runRefinementAssertion,
} from '@/assert'

suite('meta', () => {
  test('attaches metadata without changing validation semantics or mutating the source constraint', () => {
    const annotated = meta(isString, { title: 'Display name' })

    expect(validate.sync('neo', annotated)).toEqual([true, 'neo', []])
    expect(validate.sync(42, annotated)).toEqual([false, 42, [{
      value: 42,
      path: [],
      violates: {
        kind: 'assertion',
        name: 'isString',
        code: 'type.string',
        args: [],
      },
    }]])

    expect(describeConstraint(isString)).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
      code: 'type.string',
      args: [],
      constraints: [],
    })

    expect(describeConstraint(annotated)).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
      code: 'type.string',
      args: [],
      constraints: [],
      metadata: { title: 'Display name' },
    })
  })

  test('merges metadata when reapplied to the same constraint', () => {
    const annotated = meta(meta(isString, { title: 'Email' }), { placeholder: 'name@example.com' })

    expect(describeConstraint(annotated)).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
      code: 'type.string',
      args: [],
      constraints: [],
      metadata: {
        title: 'Email',
        placeholder: 'name@example.com',
      },
    })
  })
})

suite('describe', () => {
  test('describes wrappers recursively and preserves child metadata', () => {
    expect(describeConstraint(optional(meta(isString, { title: 'Nickname' })))).toEqual({
      kind: 'optional',
      child: {
        kind: 'assertion',
        name: 'isString',
        bail: true,
        code: 'type.string',
        args: [],
        constraints: [],
        metadata: { title: 'Nickname' },
      },
    })
  })

  test('describes object shapes with fields, metadata, unknown keys and object-level rules', () => {
    const registration = meta(shape({
      email: meta(isString, { format: 'email' }),
      password: isString,
      confirmPassword: isString,
    }).strict().fieldsMatch(['password', 'confirmPassword']).refine(() => [], {
      kind: 'passwordConfirmation',
      metadata: {
        fields: ['password', 'confirmPassword'],
      },
    }), {
      title: 'Registration',
    })

    const node = describeConstraint(registration)

    expect(node.kind).toBe('shape')

    if (node.kind !== 'shape') {
      return
    }

    expect(node.metadata).toEqual({ title: 'Registration' })
    expect(node.unknownKeys).toBe('strict')
    expect(node.rules).toEqual([
      { kind: 'fieldsMatch', selectors: ['password', 'confirmPassword'] },
      {
        kind: 'passwordConfirmation',
        async: true,
        metadata: {
          fields: ['password', 'confirmPassword'],
        },
      },
    ])
    expect(node.fields.email).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
      code: 'type.string',
      args: [],
      constraints: [],
      metadata: { format: 'email' },
    })
    expect(node.fields.password).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
      code: 'type.string',
      args: [],
      constraints: [],
    })
  })

  test('describes structural combinators recursively', () => {
    const schema = tuple([
      each(meta(union([exact('admin'), isNumber]), { title: 'Role list' })),
      discriminatedUnion('kind', {
        user: shape({
          kind: exact('user'),
          name: isString,
        }),
        team: record(isNumber),
      }),
    ] as const)

    const node = describeConstraint(schema)

    expect(node.kind).toBe('tuple')

    if (node.kind !== 'tuple') {
      return
    }

    expect(node.items[0]).toEqual({
      kind: 'each',
      item: {
        kind: 'union',
        branches: [
          {
            kind: 'assertion',
            name: 'exact',
            bail: true,
            code: 'value.exact',
            args: ['admin'],
            constraints: [],
          },
          {
            kind: 'assertion',
            name: 'isNumber',
            bail: true,
            code: 'type.number',
            args: [],
            constraints: [],
          },
        ],
        metadata: { title: 'Role list' },
      },
    })

    expect(node.items[1].kind).toBe('discriminatedUnion')

    if (node.items[1].kind !== 'discriminatedUnion') {
      return
    }

    expect(node.items[1].key).toBe('kind')
    expect(node.items[1].variants.user.kind).toBe('shape')
    expect(node.items[1].variants.team).toEqual({
      kind: 'record',
      values: {
        kind: 'assertion',
        name: 'isNumber',
        bail: true,
        code: 'type.number',
        args: [],
        constraints: [],
      },
    })
  })

  test('supports public custom descriptors and preserves metadata above them', () => {
    const isoDate = custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'stringFormat' as const,
          format: 'iso-date' as const,
        }
      },
    })

    expect(describeConstraint(meta(isoDate, { title: 'Published at' }))).toEqual({
      kind: 'stringFormat',
      format: 'iso-date',
      metadata: { title: 'Published at' },
    })
  })

  test('falls back to a generic validator descriptor for custom validators without a public descriptor', () => {
    const fallback = meta({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
    } satisfies Validator<string>, {
      title: 'Custom validator',
    })

    expect(describeConstraint(fallback)).toEqual({
      kind: 'validator',
      metadata: { title: 'Custom validator' },
    })
  })

  test('falls back to inferred descriptors for plain assertions and fills default assertion codes', () => {
    function plainAssertion(value: unknown) {
      return typeof value === 'string'
        ? null
        : {
          value,
          violates: {
            kind: 'assertion' as const,
            name: 'plainAssertion',
            code: 'plainAssertion',
            args: [],
          },
        }
    }

    Object.assign(plainAssertion, {
      bail: false,
      constraints: [[
        (value: string) => value.length,
        (length: number, min: number) => length >= min,
        'length.min',
        3,
      ]] as const,
    })

    expect(describeConstraint(plainAssertion as never)).toEqual({
      kind: 'assertion',
      name: 'plainAssertion',
      bail: false,
      code: 'plainAssertion',
      args: [],
      constraints: [{
        code: 'length.min',
        args: [3],
      }],
    })

    const inferredCode = assert((value: unknown): value is number => typeof value === 'number', {
      name: 'isFiniteCustom',
      bail: false,
    })

    expect(describeConstraint(inferredCode)).toEqual({
      kind: 'assertion',
      name: 'isFiniteCustom',
      bail: false,
      code: 'isFiniteCustom',
      args: [],
      constraints: [],
    })
  })
})

suite('refinement helpers', () => {
  test('checks staged refinements through the internal fast-path', () => {
    const minLength = refine({
      name: 'minLength',
      bail: true,
    }, [
      [(value: string) => value.length, (length: number, min: number) => length >= min, 'length.min', 2],
    ] as const)

    expect(checkRefinementAssertion(minLength, 'abcd')).toBe(true)
    expect(checkRefinementAssertion(minLength, 'a')).toBe(false)
  })

  test('falls back to assertion.check when no internal refinement helper is attached', () => {
    const fallback = (((value: unknown) => value === 'ok' ? null : {
      value,
      violates: {
        kind: 'assertion' as const,
        name: 'fallback',
        code: 'fallback',
        args: [],
      },
    }) as unknown) as Assertion

    Object.defineProperties(fallback, {
      name: {
        configurable: true,
        value: 'fallback',
      },
      bail: {
        enumerable: true,
        value: true,
      },
      constraints: {
        enumerable: true,
        value: [],
      },
      check: {
        enumerable: true,
        value: (value: unknown): value is 'ok' => value === 'ok',
      },
    })

    expect(checkRefinementAssertion(fallback, 'ok')).toBe(true)
    expect(checkRefinementAssertion(fallback, 'nope')).toBe(false)
  })

  test('falls back to direct assertion execution when no internal refinement runner is attached', () => {
    const fallback = (((value: unknown) => value === 'ok' ? null : {
      value,
      violates: {
        kind: 'assertion' as const,
        name: 'fallback',
        code: 'fallback',
        args: [],
      },
    }) as unknown) as Assertion

    Object.defineProperties(fallback, {
      name: {
        configurable: true,
        value: 'fallback',
      },
      bail: {
        enumerable: true,
        value: true,
      },
      constraints: {
        enumerable: true,
        value: [],
      },
      check: {
        enumerable: true,
        value: (value: unknown): value is 'ok' => value === 'ok',
      },
    })

    expect(runRefinementAssertion(fallback, 'ok')).toBeNull()
    expect(runRefinementAssertion(fallback, 'nope')).toEqual({
      value: 'nope',
      violates: {
        kind: 'assertion',
        name: 'fallback',
        code: 'fallback',
        args: [],
      },
    })
  })
})
