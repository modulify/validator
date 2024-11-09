import { expect, test } from 'vitest'

import check from '@/assertions/check'

import { HasLength } from '@/assertions/HasLength'

test.each([
  // arrays
  { options: { exact: 3 }, value: [1, 2, 3] },
  { options: { max: 5 }, value: [] },
  { options: { max: 5 }, value: [1, 2, 3, 4] },
  { options: { max: 5 }, value: [1, 2, 3, 4, 5] },
  { options: { min: 4 }, value: [1, 2, 3, 4] },
  { options: { min: 4 }, value: [1, 2, 3, 4, 5] },
  { options: { max: 5, min: 3 }, value: [1, 2, 3] },
  { options: { max: 5, min: 3 }, value: [1, 2, 3, 4, 5] },
  // strings
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
  expect(HasLength(options)(value)).toBe(true)
})

test.each([
  { options: { exact: 3 }, value: '12', reason: 'exact', meta: 3 },
  { options: { exact: 3 }, value: '1234', reason: 'exact', meta: 3 },
  { options: { max: 5 }, value: '123456', reason: 'max', meta: 5 },
  { options: { min: 3 }, value: '12', reason: 'min', meta: 3 },
  { options: { max: 5, min: 3 }, value: '123456', reason: 'max', meta: 5 },
])('invalid arrays #%#', ({ options, value, reason, meta }) => {
  expect(check(HasLength(options), value)).toEqual({
    value,
    path: [],
    violates: '@modulify/validator/HasLength',
    reason,
    meta,
  })
})

test.each([
  { options: { exact: 3 }, value: '12', reason: 'exact', meta: 3 },
  { options: { exact: 3 }, value: '1234', reason: 'exact', meta: 3 },
  { options: { max: 5 }, value: '123456', reason: 'max', meta: 5 },
  { options: { min: 3 }, value: '12', reason: 'min', meta: 3 },
  { options: { max: 5, min: 3 }, value: '123456', reason: 'max', meta: 5 },
])('invalid strings #%#', ({ options, value, reason, meta }) => {
  expect(check(HasLength(options), value)).toEqual({
    value,
    path: [],
    violates: '@modulify/validator/HasLength',
    reason,
    meta,
  })
})

test.each([
  { options: { exact: 3 }, value: {}, reason: 'unsupported', meta: undefined },
  { options: { exact: 3 }, value: null, reason: 'unsupported', meta: undefined },
  { options: { max: 5 }, value: undefined, reason: 'unsupported', meta: undefined },
  { options: { min: 3 }, value: new Date(), reason: 'unsupported', meta: undefined },
  { options: { max: 5, min: 3 }, value: new Blob(), reason: 'unsupported', meta: undefined },
])('unsupported #%#', ({ options, value, reason, meta }) => {
  expect(check(HasLength(options), value)).toEqual({
    value,
    path: [],
    violates: '@modulify/validator/HasLength',
    reason,
    meta,
  })
})