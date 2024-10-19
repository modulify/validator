import {
  describe,
  expect,
  test,
} from 'vitest'

import Length from '@/constraints/Length'
import LengthValidator from '@/validators/LengthValidator'

describe('LengthValidator', () => {
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
  ])('valid#%#', ({ options, value }) => {
    const validator = new LengthValidator(new Length(options))

    expect(validator.validate(value)).toBeNull()
  })

  test.each([
    // arrays
    { options: { exact: 3 }, value: [1, 2], reason: 'exact', meta: 3 },
    { options: { exact: 3 }, value: [1, 2, 3, 4], reason: 'exact', meta: 3 },
    { options: { max: 5 }, value: [1, 2, 3, 4, 5, 6], reason: 'max', meta: 5 },
    { options: { min: 3 }, value: [1, 2], reason: 'min', meta: 3 },
    { options: { max: 5, min: 3 }, value: [1, 2, 3, 4, 5, 6], reason: 'max', meta: 5 },
    { options: { exact: 3, max: 5, min: 3 }, value: [1, 2, 3, 4, 5, 6], reason: 'exact', meta: 3 },
    { options: { exact: 3, max: 5, min: 4 }, value: [1, 2, 3], reason: 'min', meta: 4 },
    // strings
    { options: { exact: 3 }, value: '12', reason: 'exact', meta: 3 },
    { options: { exact: 3 }, value: '1234', reason: 'exact', meta: 3 },
    { options: { max: 5 }, value: '123456', reason: 'max', meta: 5 },
    { options: { min: 3 }, value: '12', reason: 'min', meta: 3 },
    { options: { max: 5, min: 3 }, value: '123456', reason: 'max', meta: 5 },
    // unsupported
    { options: { exact: 3 }, value: {}, reason: 'unsupported', meta: undefined },
    { options: { exact: 3 }, value: null, reason: 'unsupported', meta: undefined },
    { options: { max: 5 }, value: undefined, reason: 'unsupported', meta: undefined },
    { options: { min: 3 }, value: new Date(), reason: 'unsupported', meta: undefined },
    { options: { max: 5, min: 3 }, value: new Blob(), reason: 'unsupported', meta: undefined },
  ])('invalid#%#', ({ options, value, reason, meta }) => {
    const validator = new LengthValidator(new Length(options))

    expect(validator.validate(value)).toEqual({
      by: '@modulify/validator/Length',
      value,
      path: [],
      reason,
      meta,
    })
  })
})