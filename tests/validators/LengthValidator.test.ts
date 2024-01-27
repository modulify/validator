import {
  describe,
  expect,
  test,
} from '@jest/globals'

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
    { options: { exact: 3 }, value: [1, 2], reason: 'exact' },
    { options: { exact: 3 }, value: [1, 2, 3, 4], reason: 'exact' },
    { options: { max: 5 }, value: [1, 2, 3, 4, 5, 6], reason: 'max' },
    { options: { min: 3 }, value: [1, 2], reason: 'min' },
    { options: { max: 5, min: 3 }, value: [1, 2, 3, 4, 5, 6], reason: 'max' },
    { options: { exact: 3, max: 5, min: 3 }, value: [1, 2, 3, 4, 5, 6], reason: 'exact' },
    { options: { exact: 3, max: 5, min: 4 }, value: [1, 2, 3], reason: 'min' },
    // strings
    { options: { exact: 3 }, value: '12', reason: 'exact' },
    { options: { exact: 3 }, value: '1234', reason: 'exact' },
    { options: { max: 5 }, value: '123456', reason: 'max' },
    { options: { min: 3 }, value: '12', reason: 'min' },
    { options: { max: 5, min: 3 }, value: '123456', reason: 'max' },
    // unsupported
    { options: { exact: 3 }, value: {}, reason: 'unsupported' },
    { options: { exact: 3 }, value: null, reason: 'unsupported' },
    { options: { max: 5 }, value: undefined, reason: 'unsupported' },
    { options: { min: 3 }, value: new Date(), reason: 'unsupported' },
    { options: { max: 5, min: 3 }, value: new Blob(), reason: 'unsupported' },
  ])('invalid#%#', ({ options, value, reason }) => {
    const validator = new LengthValidator(new Length(options))

    expect(validator.validate(value)).toEqual({
      value,
      reason,
      path: [],
    })
  })
})