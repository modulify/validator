import {
  describe,
  expect,
  test,
} from 'vitest'

import isNumber from '@/predicates/isNumber'

describe('predicates/isNumber', () => {
  test('returns true when a value\'s type is a number', () => {
    expect(isNumber(1)).toBe(true)
    expect(isNumber(1.5)).toBe(true)
  })

  test('returns false when a value\'s type is not a number', () => {
    expect(isNumber({})).toBe(false)
    expect(isNumber('1')).toBe(false)
    expect(isNumber('1.5')).toBe(false)
  })
})
