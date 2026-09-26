import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  hasLength,
  each,
  isDefined,
  isString,
  matches,
} from '@/index'
import { matchesConstraints } from '@/constraints'

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

  test('returns false for dynamic refinement sequences without a preceding guard', () => {
    const staged = [hasLength({ min: 2 })]

    expect(matchesConstraints('nickname', staged as never)).toBe(false)
  })

  test('uses staged refinement checks after a compatible guard succeeds', () => {
    expect(matchesConstraints('neo', [isString, hasLength({ min: 2 })])).toBe(true)
    expect(matchesConstraints('n', [isString, hasLength({ min: 2 })])).toBe(false)
  })

  test('requires a new guard after a structural validator in dynamic sequences', () => {
    const constraints = [each(isString), hasLength({ min: 2 })]

    expect(matchesConstraints(['a', 'b'], constraints as never)).toBe(false)
    expect(matchesConstraints(['a', 'b'], [each(isString), isDefined, hasLength({ min: 2 })])).toBe(true)
  })
})
