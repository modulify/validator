import type {
  ValidationTuple,
  Violation,
} from '@/index'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import {
  exact,
  nullable,
  nullish,
  optional,
  record,
  shape,
  tuple,
} from '@/combinators'
import {
  isString,
  matches,
  validate,
} from '@/index'

describe('combinator types', () => {
  test('exact preserves literal types', () => {
    const result = validate.sync('admin', exact('admin'))

    assertType<ValidationTuple<'admin'>>(result)
  })

  test('optional, nullable and nullish affect inferred object types', () => {
    const schema = shape({
      nickname: optional(isString),
      middleName: nullable(isString),
      bio: nullish(isString),
      role: exact('admin'),
    })

    const result = validate.sync({
      nickname: undefined,
      middleName: null,
      bio: 'filled',
      role: 'admin',
    }, schema)

    assertType<ValidationTuple<{
      nickname: string | undefined;
      middleName: string | null;
      bio: string | null | undefined;
      role: 'admin';
    }>>(result)
  })

  test('matches.sync narrows the original value with combinators', () => {
    const value: unknown = undefined

    if (matches.sync(value, optional(isString))) {
      assertType<string | undefined>(value)
    }

    const role: unknown = 'admin'

    if (matches.sync(role, exact('admin'))) {
      assertType<'admin'>(role)
    }
  })

  test('failure branches keep violation arrays', () => {
    const [ok, validated, violations] = validate.sync('user', exact('admin'))

    if (ok) {
      assertType<'admin'>(validated)
      assertType<[]>(violations)
    } else {
      assertType<unknown>(validated)
      assertType<Violation[]>(violations)
    }
  })

  test('tuple preserves positional inference', () => {
    const result = validate.sync(['admin', undefined], tuple([exact('admin'), optional(isString)]))

    assertType<ValidationTuple<['admin', string | undefined]>>(result)
  })

  test('record wraps value inference for dynamic keys', () => {
    const result = validate.sync({
      primary: 'admin',
      backup: 'admin',
    }, record(exact('admin')))

    assertType<ValidationTuple<Record<string, 'admin'>>>(result)
  })
})
