import {
  expect,
  test,
} from 'vitest'

import { OneOf } from '@/assertions'

test('array', () => {
  const isCorrect = OneOf([1, 2, 3])

  expect(isCorrect(1)).toBe(true)
  expect(isCorrect(2)).toBe(true)
  expect(isCorrect(3)).toBe(true)
  expect(isCorrect(4)).toBe(false)
})

test('enum', () => {
  enum Appearance {
    Filled = 'filled',
    Outline = 'outline',
    Tonal = 'tonal'
  }

  const isCorrect = OneOf(Appearance)

  expect(isCorrect.meta).toEqual([
    Appearance.Filled,
    Appearance.Outline,
    Appearance.Tonal,
  ])

  expect(isCorrect('filled')).toBe(true)
  expect(isCorrect('outline')).toBe(true)
  expect(isCorrect('tonal')).toBe(true)
  expect(isCorrect(Appearance.Filled)).toBe(true)
  expect(isCorrect(Appearance.Outline)).toBe(true)
  expect(isCorrect(Appearance.Tonal)).toBe(true)
  expect(isCorrect('')).toBe(false)
})

test('equalTo option', () => {
  const isCorrect = OneOf([
    { value: 1 },
    { value: 2 },
    { value: 3 },
  ], { equalTo: (a, b) => typeof b === 'object' && 'value' in b && a.value === b.value })

  expect(isCorrect.meta).toEqual([
    { value: 1 },
    { value: 2 },
    { value: 3 },
  ])

  expect(isCorrect({ value: 1 })).toBe(true)
  expect(isCorrect({ value: 2 })).toBe(true)
  expect(isCorrect({ value: 3 })).toBe(true)
  expect(isCorrect({ value: 3, label: 'Third' })).toBe(true)
  expect(isCorrect({ value: 4 })).toBe(false)
  expect(isCorrect(1)).toBe(false)
  expect(isCorrect(2)).toBe(false)
  expect(isCorrect(3)).toBe(false)
})

test.each([
  { accept: ['1', 2, 3], value: 4 },
  { accept: [1, 2, 3], value: 4 },
  { accept: [1, 2, 3, '4'], value: 4 },
])('invalid#%#', ({ accept, value }) => {
  const isCorrect = OneOf(accept)

  expect(isCorrect.meta).toEqual(accept)
  expect(isCorrect(value)).toBe(false)
})