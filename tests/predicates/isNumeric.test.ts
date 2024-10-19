import {
  describe,
  expect,
  test,
} from 'vitest'

import isNumeric from '@/predicates/isNumeric'

describe('predicates/isNumeric', () => {
  test('returns true when a value is a number or a numeric string', () => {
    expect(isNumeric(1)).toBe(true)
    expect(isNumeric(1.5)).toBe(true)
    expect(isNumeric('1')).toBe(true)
    expect(isNumeric('1.5')).toBe(true)
  })

  test('returns false when a value is not a number or a numeric string', () => {
    expect(isNumeric({})).toBe(false)
    expect(isNumeric('a1')).toBe(false)
    expect(isNumeric('1.3y5')).toBe(false)
    expect(isNumeric('1.3y5', true)).toBe(false)
    expect(isNumeric(null)).toBe(false)
    expect(isNumeric(undefined)).toBe(false)
    expect(isNumeric(Symbol('2'))).toBe(false)
  })

  test('returns false when a value is a number or a numeric string, but not integer when flag is set to true', () => {
    expect(isNumeric(1.5, true)).toBe(false)
    expect(isNumeric('1.5', true)).toBe(false)
  })
})
