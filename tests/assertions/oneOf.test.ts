import {
  expect,
  test,
} from 'vitest'

import { oneOf } from '@/assertions'

test('array', () => {
  const isCorrect = oneOf([1, 2, 3]).check

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

  const isCorrect = oneOf(Appearance).check

  expect(isCorrect('filled')).toBe(true)
  expect(isCorrect('outline')).toBe(true)
  expect(isCorrect('tonal')).toBe(true)
  expect(isCorrect(Appearance.Filled)).toBe(true)
  expect(isCorrect(Appearance.Outline)).toBe(true)
  expect(isCorrect(Appearance.Tonal)).toBe(true)
  expect(isCorrect('')).toBe(false)
})

test('equalTo option', () => {
  const isCorrect = oneOf([
    { value: 1 },
    { value: 2 },
    { value: 3 },
  ], { equalTo: (a, b) => typeof b === 'object' && 'value' in b && a.value === b.value }).check

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
  expect(oneOf(accept).check(value)).toBe(false)
})
