import { expect, test } from 'vitest'

import { hasLength } from '@/assertions'

test.each([
  { options: { exact: 3 }, value: [1, 2, 3] },
  { options: { max: 5 }, value: [] },
  { options: { max: 5 }, value: [1, 2, 3, 4] },
  { options: { max: 5 }, value: [1, 2, 3, 4, 5] },
  { options: { min: 4 }, value: [1, 2, 3, 4] },
  { options: { min: 4 }, value: [1, 2, 3, 4, 5] },
  { options: { max: 5, min: 3 }, value: [1, 2, 3] },
  { options: { max: 5, min: 3 }, value: [1, 2, 3, 4, 5] },
  { options: { exact: 3 }, value: '123' },
  { options: { exact: 5 }, value: '12345' },
  { options: { max: 5 }, value: '' },
  { options: { max: 5 }, value: '1234' },
  { options: { max: 5 }, value: '12345' },
  { options: { min: 3 }, value: '123' },
  { options: { min: 3 }, value: '1234' },
  { options: { max: 5, min: 3 }, value: '123' },
  { options: { max: 5, min: 3 }, value: '1234' },
  { options: { max: 5, min: 3 }, value: '12345' },
])('valid #%#', ({ options, value }) => {
  expect(hasLength(options).check(value)).toBe(true)
  expect(hasLength(options)(value)).toBe(null)
})

test('treats missing options as no-op checks for supported values', () => {
  expect(hasLength().check('abc')).toBe(true)
  expect(hasLength().check([1, 2, 3])).toBe(true)
  expect(hasLength()('abc')).toBe(null)
  expect(hasLength()([1, 2, 3])).toBe(null)
})

test.each([
  { options: { exact: 3 }, value: '12', rule: 'exact', args: [3] },
  { options: { exact: 3 }, value: '1234', rule: 'exact', args: [3] },
  { options: { max: 5 }, value: '123456', rule: 'max', args: [5] },
  { options: { min: 3 }, value: '12', rule: 'min', args: [3] },
  { options: { max: 5, min: 3 }, value: '123456', rule: 'max', args: [5] },
])('invalid strings #%#', ({ options, value, rule, args }) => {
  expect(hasLength(options)(value)).toEqual({
    value,
    violates: {
      predicate: 'hasLength',
      rule,
      args,
    },
  })
})

test.each([
  { options: { exact: 3 }, value: [1, 2], rule: 'exact', args: [3] },
  { options: { max: 5 }, value: [1, 2, 3, 4, 5, 6], rule: 'max', args: [5] },
  { options: { min: 3 }, value: [], rule: 'min', args: [3] },
  { options: { range: [3, 5] as [number, number] }, value: [1, 2], rule: 'range', args: [[3, 5]] },
  { options: { range: [3, 5] as [number, number] }, value: [1, 2, 3, 4, 5, 6], rule: 'range', args: [[3, 5]] },
])('invalid arrays #%#', ({ options, value, rule, args }) => {
  expect(hasLength(options)(value)).toEqual({
    value,
    violates: {
      predicate: 'hasLength',
      rule,
      args,
    },
  })
})

test.each([
  { options: { exact: 3 }, value: {} },
  { options: { exact: 3 }, value: null },
  { options: { max: 5 }, value: undefined },
  { options: { min: 3 }, value: new Date() },
  { options: { max: 5, min: 3 }, value: new Blob() },
])('unsupported #%#', ({ options, value }) => {
  expect(hasLength(options)(value)).toEqual({
    value,
    violates: {
      predicate: 'hasLength',
      rule: 'unsupported',
      args: [],
    },
  })
})
