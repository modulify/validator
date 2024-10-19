import {
  describe,
  expect,
  test,
} from 'vitest'

import isNull from '@/predicates/isNull'

describe('predicates/isNull', () => {
  test('returns true when a value is equal to undefined', () => {
    expect(isNull(null)).toBe(true)
  })

  test('returns false when a value is not equal to undefined', () => {
    expect(isNull({})).toBe(false)
    expect(isNull(2)).toBe(false)
    expect(isNull(Symbol('2'))).toBe(false)
  })
})
