import {
  describe,
  expect,
  test,
} from 'vitest'

import isUndefined from '@/predicates/isUndefined'

describe('predicates/isUndefined', () => {
  test('returns true when a value is equal to undefined', () => {
    expect(isUndefined(undefined)).toBe(true)
  })

  test('returns false when a value is not equal to undefined', () => {
    expect(isUndefined({})).toBe(false)
    expect(isUndefined(2)).toBe(false)
    expect(isUndefined(Symbol('2'))).toBe(false)
  })
})
