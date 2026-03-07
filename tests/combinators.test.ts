import { describe, expect, test } from 'vitest'

import {
  each,
  exact,
  nullable,
  nullish,
  optional,
  record,
  shape,
  tuple,
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
})
