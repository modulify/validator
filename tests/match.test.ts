import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  isDefined,
  isString,
  matches,
} from '@/index'

const expectString = <T extends string>(value: T) => value

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
