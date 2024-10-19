import {
  describe,
  expect,
  test,
} from 'vitest'

import hasProperty from '@/predicates/hasProperty'

const property = Symbol('property')

describe('predicates/hasProperty', () => {
  test('returns true when property exists', () => {
    expect(hasProperty({ a: 1 }, 'a')).toBe(true)
    expect(hasProperty({ 0: 1 }, 0)).toBe(true)
    expect(hasProperty({ [property]: 1 }, property)).toBe(true)
    expect(hasProperty([], 'length')).toBe(true)
  })

  test('returns false when property does not exist', () => {
    expect(hasProperty({}, 'a')).toBe(false)
    expect(hasProperty({}, 0)).toBe(false)
    expect(hasProperty({}, property)).toBe(false)
    expect(hasProperty(null, property)).toBe(false)
    expect(hasProperty([], 'does_not_exists')).toBe(false)
  })
})
