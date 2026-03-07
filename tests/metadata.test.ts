import type { Validator } from '~types'

import {
  describe as suite,
  expect,
  test,
} from 'vitest'

import {
  describe as describeConstraint,
  discriminatedUnion,
  each,
  exact,
  isNumber,
  isString,
  meta,
  optional,
  record,
  shape,
  tuple,
  union,
  validate,
} from '@/index'

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
      constraints: [],
    })

    expect(describeConstraint(annotated)).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
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
    }).strict().fieldsMatch(['password', 'confirmPassword']).refine(() => []), {
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
      { kind: 'refine' },
    ])
    expect(node.fields.email).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
      constraints: [],
      metadata: { format: 'email' },
    })
    expect(node.fields.password).toEqual({
      kind: 'assertion',
      name: 'isString',
      bail: true,
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
            constraints: [],
          },
          {
            kind: 'assertion',
            name: 'isNumber',
            bail: true,
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
        constraints: [],
      },
    })
  })

  test('falls back to a generic validator descriptor for custom validators', () => {
    const custom = meta({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
    } satisfies Validator<string>, {
      title: 'Custom validator',
    })

    expect(describeConstraint(custom)).toEqual({
      kind: 'validator',
      metadata: { title: 'Custom validator' },
    })
  })
})
