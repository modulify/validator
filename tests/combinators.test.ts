import { describe, expect, test } from 'vitest'

import {
  discriminatedUnion,
  each,
  exact,
  nullable,
  nullish,
  optional,
  record,
  shape,
  tuple,
  union,
} from '@/combinators'
import {
  hasLength,
  isDefined,
  isNumber,
  isString,
} from '@/assertions'
import {
  matches,
  validate,
} from '@/index'

const assertionSubject = (name: string, code: string, args: unknown[] = []) => ({ kind: 'assertion', name, code, args })
const validatorSubject = (name: string, code: string, args: unknown[] = []) => ({ kind: 'validator', name, code, args })

describe('exact', () => {
  test('passes only exact values', () => {
    expect(exact('admin').check('admin')).toBe(true)
    expect(exact('admin').check('user')).toBe(false)
    expect(exact(3).check(3)).toBe(true)
    expect(exact(3).check('3')).toBe(false)
  })

  test('returns structured violation for non-matching values', () => {
    expect(exact('admin')('user')).toEqual({
      value: 'user',
      violates: assertionSubject('exact', 'value.exact', ['admin']),
    })
  })
})

describe('optional', () => {
  test('accepts undefined and validates present values', () => {
    expect(optional(isString).check(undefined)).toBe(true)
    expect(optional(isString).check('nickname')).toBe(true)
    expect(optional(isString).check(42)).toBe(false)
  })

  test('keeps nested violations for invalid present values', () => {
    expect(validate.sync(42, optional(isString))).toEqual([false, 42, [{
      value: 42,
      path: [],
      violates: assertionSubject('isString', 'type.string'),
    }]])
  })
})

describe('nullable', () => {
  test('accepts null and validates present values', () => {
    expect(nullable(isNumber).check(null)).toBe(true)
    expect(nullable(isNumber).check(3)).toBe(true)
    expect(nullable(isNumber).check('3')).toBe(false)
  })
})

describe('nullish', () => {
  test('accepts both null and undefined', () => {
    expect(nullish(isString).check(null)).toBe(true)
    expect(nullish(isString).check(undefined)).toBe(true)
    expect(nullish(isString).check('nick')).toBe(true)
    expect(nullish(isString).check(false)).toBe(false)
  })
})

describe('combinators in object schemas', () => {
  const profile = shape({
    nickname: optional(isString),
    middleName: nullable(isString),
    bio: nullish(isString),
    role: exact('admin'),
  })

  test('allow missing and nullish fields in a single schema', () => {
    expect(validate.sync({
      middleName: null,
      role: 'admin',
    }, profile)).toEqual([true, {
      middleName: null,
      role: 'admin',
    }, []])
  })

  test('preserve nested paths when mixed combinators fail', () => {
    expect(validate.sync({
      nickname: 42,
      middleName: false,
      bio: 'filled',
      role: 'user',
    }, profile)).toEqual([false, {
      nickname: 42,
      middleName: false,
      bio: 'filled',
      role: 'user',
    }, [{
      value: 42,
      path: ['nickname'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: false,
      path: ['middleName'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: 'user',
      path: ['role'],
      violates: assertionSubject('exact', 'value.exact', ['admin']),
    }]])
  })
})

describe('combinators inside arrays and sync narrowing', () => {
  test('work inside each', () => {
    expect(validate.sync([1, undefined, 2], each(optional(isNumber)))).toEqual([true, [1, undefined, 2], []])
  })

  test('keep array item paths for invalid items', () => {
    expect(validate.sync([1, '2'], each(optional(isNumber)))).toEqual([false, [1, '2'], [{
      value: '2',
      path: [1],
      violates: assertionSubject('isNumber', 'type.number'),
    }]])
  })

  test('narrow original values through matches.sync', () => {
    const value: unknown = undefined

    if (matches.sync(value, optional(isString))) {
      expect(value).toBeUndefined()
    }

    expect(matches.sync('admin' as unknown, exact('admin'))).toBe(true)
    expect(matches.sync('user' as unknown, exact('admin'))).toBe(false)
  })
})

describe('structural combinators', () => {
  test('shape checks object structure asynchronously', async () => {
    const constraint = shape({
      form: [
        isDefined,
        shape({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      ],
    })

    expect(await validate({
      form: {
        nickname: 'none',
        password: 'qwerty',
      },
    }, constraint)).toEqual([true, {
      form: {
        nickname: 'none',
        password: 'qwerty',
      },
    }, []])

    expect(await validate({}, constraint)).toEqual([false, {}, [{
      value: undefined,
      path: ['form'],
      violates: assertionSubject('isDefined', 'value.defined'),
    }]])

    expect(await validate({
      form: {
        nickname: '',
        password: '',
      },
    }, constraint)).toEqual([false, {
      form: {
        nickname: '',
        password: '',
      },
    }, [{
      value: '',
      path: ['form', 'nickname'],
      violates: assertionSubject('hasLength', 'length.min', [4]),
    }, {
      value: '',
      path: ['form', 'password'],
      violates: assertionSubject('hasLength', 'length.min', [6]),
    }]])
  })

  test('shape rejects non-record values synchronously and asynchronously', async () => {
    const constraint = shape({
      form: shape({
        nickname: [isString, hasLength({ min: 4 })],
        password: [isString, hasLength({ min: 6 })],
      }),
    })

    expect(await validate('', constraint)).toEqual([false, '', [{
      value: '',
      path: [],
      violates: { kind: 'validator', name: 'shape', code: 'type.record', args: [] },
    }]])

    expect(validate.sync('', constraint)).toEqual([false, '', [{
      value: '',
      path: [],
      violates: { kind: 'validator', name: 'shape', code: 'type.record', args: [] },
    }]])
  })

  test('each checks elements in array asynchronously', async () => {
    const constraint = each([
      shape({
        name: [isString, hasLength({ min: 4, max: 6 })],
      }),
    ])

    expect(await validate([
      { name: '' },
      { name: 'tooLong' },
    ], constraint)).toEqual([false, [
      { name: '' },
      { name: 'tooLong' },
    ], [{
      value: '',
      path: [0, 'name'],
      violates: assertionSubject('hasLength', 'length.min', [4]),
    }, {
      value: 'tooLong',
      path: [1, 'name'],
      violates: assertionSubject('hasLength', 'length.max', [6]),
    }]])
  })

  test('each rejects non-array values synchronously and asynchronously', async () => {
    const constraint = each([
      shape({
        name: [isString, hasLength({ min: 4, max: 6 })],
      }),
    ])

    expect(await validate({ name: 'tooLong' }, constraint)).toEqual([false, { name: 'tooLong' }, [{
      value: { name: 'tooLong' },
      path: [],
      violates: { kind: 'validator', name: 'each', code: 'type.array', args: [] },
    }]])

    expect(validate.sync({ name: 'tooLong' }, constraint)).toEqual([false, { name: 'tooLong' }, [{
      value: { name: 'tooLong' },
      path: [],
      violates: { kind: 'validator', name: 'each', code: 'type.array', args: [] },
    }]])
  })

  test('tuple validates fixed positions', () => {
    expect(validate.sync(['admin', 3], tuple([exact('admin'), isNumber]))).toEqual([true, ['admin', 3], []])
  })

  test('tuple reports length mismatches before nested validation', () => {
    expect(validate.sync(['admin'], tuple([exact('admin'), isNumber]))).toEqual([false, ['admin'], [{
      value: ['admin'],
      path: [],
      violates: { kind: 'validator', name: 'tuple', code: 'tuple.length', args: [2] },
    }]])
  })

  test('tuple keeps positional paths for nested failures', () => {
    expect(validate.sync(['user', '3'], tuple([exact('admin'), isNumber]))).toEqual([false, ['user', '3'], [{
      value: 'user',
      path: [0],
      violates: assertionSubject('exact', 'value.exact', ['admin']),
    }, {
      value: '3',
      path: [1],
      violates: assertionSubject('isNumber', 'type.number'),
    }]])
  })

  test('record validates dynamic keys with shared constraints', () => {
    expect(validate.sync({
      primary: 'admin',
      backup: 'admin',
    }, record(exact('admin')))).toEqual([true, {
      primary: 'admin',
      backup: 'admin',
    }, []])
  })

  test('record keeps failing keys in violation paths', () => {
    expect(validate.sync({
      primary: 'admin',
      backup: 'user',
    }, record(exact('admin')))).toEqual([false, {
      primary: 'admin',
      backup: 'user',
    }, [{
      value: 'user',
      path: ['backup'],
      violates: assertionSubject('exact', 'value.exact', ['admin']),
    }]])
  })

  test('record rejects non-record values', () => {
    expect(validate.sync([], record(isString))).toEqual([false, [], [{
      value: [],
      path: [],
      violates: { kind: 'validator', name: 'record', code: 'type.record', args: [] },
    }]])
  })

  test('union accepts values that match any branch', () => {
    expect(validate.sync('admin', union([exact('admin'), exact('editor')]))).toEqual([true, 'admin', []])
    expect(validate.sync(3, union([exact('admin'), isNumber]))).toEqual([true, 3, []])
  })

  test('union keeps branch details when no branch matches', () => {
    expect(validate.sync('guest', union([exact('admin'), exact('editor')]))).toEqual([false, 'guest', [{
      value: 'guest',
      path: [],
      violates: { kind: 'validator', name: 'union', code: 'union.no-match', args: [2] },
    }, {
      value: 'guest',
      path: [],
      violates: assertionSubject('exact', 'value.exact', ['admin']),
    }, {
      value: 'guest',
      path: [],
      violates: assertionSubject('exact', 'value.exact', ['editor']),
    }]])
  })

  test('union composes object variants', () => {
    const variant = union([
      shape({
        kind: exact('user'),
        name: isString,
      }),
      shape({
        kind: exact('team'),
        size: isNumber,
      }),
    ])

    expect(validate.sync({
      kind: 'team',
      size: 3,
    }, variant)).toEqual([true, {
      kind: 'team',
      size: 3,
    }, []])

    expect(validate.sync({
      kind: 'team',
      size: '3',
    }, variant)).toEqual([false, {
      kind: 'team',
      size: '3',
    }, [{
      value: {
        kind: 'team',
        size: '3',
      },
      path: [],
      violates: { kind: 'validator', name: 'union', code: 'union.no-match', args: [2] },
    }, {
      value: 'team',
      path: ['kind'],
      violates: assertionSubject('exact', 'value.exact', ['user']),
    }, {
      value: undefined,
      path: ['name'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: '3',
      path: ['size'],
      violates: assertionSubject('isNumber', 'type.number'),
    }]])
  })

  test('discriminatedUnion accepts matching variants', () => {
    const variant = discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      team: shape({
        kind: exact('team'),
        size: isNumber,
      }),
    })

    expect(validate.sync({
      kind: 'team',
      size: 3,
    }, variant)).toEqual([true, {
      kind: 'team',
      size: 3,
    }, []])
  })

  test('discriminatedUnion reports invalid discriminator values', () => {
    const variant = discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      team: shape({
        kind: exact('team'),
        size: isNumber,
      }),
    })

    expect(validate.sync({
      kind: 'guest',
      name: 'Alice',
    }, variant)).toEqual([false, {
      kind: 'guest',
      name: 'Alice',
    }, [{
      value: 'guest',
      path: ['kind'],
      violates: {
        kind: 'validator',
        name: 'discriminatedUnion',
        code: 'union.invalid-discriminator',
        args: [['user', 'team']],
      },
    }]])
  })

  test('discriminatedUnion validates only the selected branch', () => {
    const variant = discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      team: shape({
        kind: exact('team'),
        size: isNumber,
      }),
    })

    expect(validate.sync({
      kind: 'team',
      size: '3',
    }, variant)).toEqual([false, {
      kind: 'team',
      size: '3',
    }, [{
      value: '3',
      path: ['size'],
      violates: assertionSubject('isNumber', 'type.number'),
    }]])
  })

  test('discriminatedUnion rejects non-record values', () => {
    const variant = discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
    })

    expect(validate.sync([], variant)).toEqual([false, [], [{
      value: [],
      path: [],
      violates: {
        kind: 'validator',
        name: 'discriminatedUnion',
        code: 'type.record',
        args: [],
      },
    }]])
  })
})

describe('shape object api', () => {
  const profile = shape({
    id: isString,
    nickname: optional(isString),
    role: exact('admin'),
  })

  test('provide descriptor introspection and validate as regular constraints', () => {
    expect(profile.descriptor).toEqual({
      id: isString,
      nickname: profile.descriptor.nickname,
      role: profile.descriptor.role,
    })
    expect(profile.unknownKeys).toBe('passthrough')
    expect(matches.sync({
      id: 'u1',
      nickname: undefined,
      role: 'admin',
    } as unknown, profile)).toBe(true)
  })

  test('default to passthrough mode for unknown keys', () => {
    expect(validate.sync({
      id: 'u1',
      role: 'admin',
      extra: true,
    }, profile)).toEqual([true, {
      id: 'u1',
      role: 'admin',
      extra: true,
    }, []])
  })

  test('strict rejects unknown keys with machine-readable violations on the key path', () => {
    expect(validate.sync({
      id: 'u1',
      role: 'admin',
      extra: true,
    }, profile.strict())).toEqual([false, {
      id: 'u1',
      role: 'admin',
      extra: true,
    }, [{
      value: true,
      path: ['extra'],
      violates: validatorSubject('shape', 'shape.unknown-key'),
    }]])
  })

  test('passthrough switches strict schemas back to permissive mode', () => {
    expect(validate.sync({
      id: 'u1',
      role: 'admin',
      extra: true,
    }, profile.strict().passthrough())).toEqual([true, {
      id: 'u1',
      role: 'admin',
      extra: true,
    }, []])
  })

  test('pick and omit derive shapes without manual descriptor cloning', () => {
    expect(validate.sync({
      id: 'u1',
      nickname: 'neo',
    }, profile.pick(['id', 'nickname']))).toEqual([true, {
      id: 'u1',
      nickname: 'neo',
    }, []])

    expect(validate.sync({
      id: 'u1',
      role: 'admin',
    }, profile.omit(['nickname']))).toEqual([true, {
      id: 'u1',
      role: 'admin',
    }, []])
  })

  test('partial wraps every field with optional and keeps omitted values collapsed with undefined', () => {
    expect(validate.sync({}, profile.partial())).toEqual([true, {}, []])
    expect(validate.sync({
      id: undefined,
      nickname: undefined,
      role: undefined,
    }, profile.partial())).toEqual([true, {
      id: undefined,
      nickname: undefined,
      role: undefined,
    }, []])
  })

  test('extend adds or overrides fields while preserving the current unknown-keys mode', () => {
    const extended = profile.strict().extend({
      nickname: isString,
      email: isString,
    })

    expect(extended.unknownKeys).toBe('strict')
    expect(validate.sync({
      id: 'u1',
      nickname: undefined,
      role: 'admin',
      email: 'kirill@example.com',
    }, extended)).toEqual([false, {
      id: 'u1',
      nickname: undefined,
      role: 'admin',
      email: 'kirill@example.com',
    }, [{
      value: undefined,
      path: ['nickname'],
      violates: assertionSubject('isString', 'type.string'),
    }]])
  })

  test('merge combines descriptors and keeps the receiver unknown-keys mode', () => {
    const merged = profile.strict().merge(shape({
      role: exact('editor'),
      team: isString,
    }))

    expect(merged.unknownKeys).toBe('strict')
    expect(validate.sync({
      id: 'u1',
      role: 'editor',
      team: 'validators',
      extra: true,
    }, merged)).toEqual([false, {
      id: 'u1',
      role: 'editor',
      team: 'validators',
      extra: true,
    }, [{
      value: true,
      path: ['extra'],
      violates: validatorSubject('shape', 'shape.unknown-key'),
    }]])
  })

  test('refine adds sync object-level rules that run after structural validation', async () => {
    const registration = shape({
      password: isString,
      confirmPassword: isString,
    }).refine(value => {
      return value.password === value.confirmPassword
        ? []
        : [{
          path: ['confirmPassword'],
          code: 'shape.fields.mismatch',
          args: [['password', 'confirmPassword']],
        }]
    })

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 'secret',
    }, registration)).toEqual([true, {
      password: 'secret',
      confirmPassword: 'secret',
    }, []])

    expect(await validate({
      password: 'secret',
      confirmPassword: 'different',
    }, registration)).toEqual([false, {
      password: 'secret',
      confirmPassword: 'different',
    }, [{
      value: 'different',
      path: ['confirmPassword'],
      violates: validatorSubject('shape', 'shape.fields.mismatch', [['password', 'confirmPassword']]),
    }]])
  })

  test('refine can target nested paths when matching fields from different object levels', () => {
    const registration = shape({
      password: isString,
      confirm: shape({
        password: isString,
      }),
    }).refine(value => {
      return value.password === value.confirm.password
        ? []
        : [{
          path: ['confirm', 'password'],
          code: 'shape.fields.mismatch',
          args: [['password', 'confirm.password']],
        }]
    })

    expect(validate.sync({
      password: 'secret',
      confirm: {
        password: 'different',
      },
    }, registration)).toEqual([false, {
      password: 'secret',
      confirm: {
        password: 'different',
      },
    }, [{
      value: 'different',
      path: ['confirm', 'password'],
      violates: validatorSubject('shape', 'shape.fields.mismatch', [['password', 'confirm.password']]),
    }]])
  })

  test('refine defaults to the object path and current value for object-level violations', () => {
    const ranged = shape({
      start: isString,
      end: isString,
    }).refine(() => ({
      code: 'shape.range.invalid',
    }))

    expect(validate.sync({
      start: '2026-03-01',
      end: '2026-02-01',
    }, ranged)).toEqual([false, {
      start: '2026-03-01',
      end: '2026-02-01',
    }, [{
      value: {
        start: '2026-03-01',
        end: '2026-02-01',
      },
      path: [],
      violates: validatorSubject('shape', 'shape.range.invalid'),
    }]])
  })

  test('refine skips execution until the base shape has validated successfully', () => {
    let runs = 0

    const registration = shape({
      password: isString,
      confirmPassword: isString,
    }).refine(() => {
      runs += 1

      return [{
        code: 'shape.refine.unreachable',
      }]
    })

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 1,
    }, registration)).toEqual([false, {
      password: 'secret',
      confirmPassword: 1,
    }, [{
      value: 1,
      path: ['confirmPassword'],
      violates: assertionSubject('isString', 'type.string'),
    }]])
    expect(runs).toBe(0)
  })

  test('fieldsMatch is a thin helper over refine for the common confirmation-field case', () => {
    const registration = shape({
      password: isString,
      confirmPassword: isString,
    }).fieldsMatch(['password', 'confirmPassword'])

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 'different',
    }, registration)).toEqual([false, {
      password: 'secret',
      confirmPassword: 'different',
    }, [{
      value: 'different',
      path: ['confirmPassword'],
      violates: validatorSubject('shape', 'shape.fields.mismatch', [['password', 'confirmPassword']]),
    }]])
  })

  test('strict and passthrough keep object-level rules, while structural transforms drop them', () => {
    const confirmed = shape({
      password: isString,
      confirmPassword: isString,
    }).fieldsMatch(['password', 'confirmPassword'])

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 'different',
    }, confirmed.strict())).toEqual([false, {
      password: 'secret',
      confirmPassword: 'different',
    }, [{
      value: 'different',
      path: ['confirmPassword'],
      violates: validatorSubject('shape', 'shape.fields.mismatch', [['password', 'confirmPassword']]),
    }]])

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 'different',
    }, confirmed.strict().passthrough())).toEqual([false, {
      password: 'secret',
      confirmPassword: 'different',
    }, [{
      value: 'different',
      path: ['confirmPassword'],
      violates: validatorSubject('shape', 'shape.fields.mismatch', [['password', 'confirmPassword']]),
    }]])

    expect(validate.sync({
      password: 'secret',
    }, confirmed.pick(['password']))).toEqual([true, {
      password: 'secret',
    }, []])

    expect(validate.sync({
      password: 'secret',
    }, confirmed.omit(['confirmPassword']))).toEqual([true, {
      password: 'secret',
    }, []])

    expect(validate.sync({
      password: 'secret',
    }, confirmed.partial())).toEqual([true, {
      password: 'secret',
    }, []])

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 'different',
      email: 'kirill@example.com',
    }, confirmed.extend({
      email: isString,
    }))).toEqual([true, {
      password: 'secret',
      confirmPassword: 'different',
      email: 'kirill@example.com',
    }, []])

    expect(validate.sync({
      password: 'secret',
      confirmPassword: 'different',
      email: 'kirill@example.com',
      emailConfirmation: 'other@example.com',
    }, confirmed.merge(shape({
      email: isString,
      emailConfirmation: isString,
    }).fieldsMatch(['email', 'emailConfirmation'])))).toEqual([true, {
      password: 'secret',
      confirmPassword: 'different',
      email: 'kirill@example.com',
      emailConfirmation: 'other@example.com',
    }, []])
  })
})
