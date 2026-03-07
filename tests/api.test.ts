import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  each,
  shape,
  isDefined,
  isString,
  matches,
  validate,
} from '@/index'

const expectString = <T extends string>(value: T) => value
const expectProfile = <T extends { name: string; tags: string[] }>(value: T) => value
const assertionSubject = (name: string, code: string, args: unknown[] = []) => ({ kind: 'assertion', name, code, args })
const validatorSubject = (name: string, code: string, args: unknown[] = []) => ({ kind: 'validator', name, code, args })

describe('matches.sync', () => {
  test('narrows successful sync validation', () => {
    const value: unknown = 'nickname'

    expect(matches.sync(value, [isDefined, isString])).toBe(true)

    if (matches.sync(value, [isDefined, isString])) {
      expectString(value)
      expect(value.toUpperCase()).toBe('NICKNAME')
    }
  })

  test('returns false for invalid values', () => {
    const value: unknown = 42

    expect(matches.sync(value, [isDefined, isString])).toBe(false)
  })
})

describe('validate tuple API', () => {
  const profile = shape({
    name: [isDefined, isString],
    tags: each(isString),
  })

  test('returns typed sync success branch through the validated tuple item', () => {
    const [ok, validated, violations] = validate.sync({
      name: 'kirill',
      tags: ['ts', 'validation'],
    }, profile)

    expect(ok).toBe(true)

    if (ok) {
      expectProfile(validated)
      expect(violations).toEqual([])
      expect(validated.tags[0]?.toUpperCase()).toBe('TS')
    }
  })

  test('returns sync failure branch with the original value and violations', () => {
    const [ok, validated, violations] = validate.sync({
      name: 'kirill',
      tags: 'ts',
    }, profile)

    expect(ok).toBe(false)
    expect(validated).toEqual({
      name: 'kirill',
      tags: 'ts',
    })
    expect(violations).toEqual([{
      value: 'ts',
      path: ['tags'],
      violates: validatorSubject('each', 'type.array'),
    }])
  })

  test('returns typed async success branch through destructuring', async () => {
    const [ok, validated, violations] = await validate({
      name: 'kirill',
      tags: ['ts'],
    }, profile)

    expect(ok).toBe(true)

    if (ok) {
      expectProfile(validated)
      expect(violations).toEqual([])
      expect(validated.name.toUpperCase()).toBe('KIRILL')
    }
  })

  test('keeps tuple items correlated after destructuring in the failure branch', async () => {
    const [ok, validated, violations] = await validate({
      name: 'kirill',
      tags: [1],
    }, profile)

    expect(ok).toBe(false)

    if (!ok) {
      expect(validated).toEqual({
        name: 'kirill',
        tags: [1],
      })
      expect(violations).toEqual([{
        value: 1,
        path: ['tags', 0],
        violates: assertionSubject('isString', 'type.string'),
      }])
    }
  })
})
