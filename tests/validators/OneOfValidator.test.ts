import {
  describe,
  expect,
  test,
} from '@jest/globals'

import OneOf from '@/constraints/OneOf'
import OneOfValidator from '@/validators/OneOfValidator'

describe('OneOfValidator', () => {
  test('valid', () => {
    const validator = new OneOfValidator(new OneOf([
      1, 2, 3,
    ]))

    expect(validator.validate(1)).toBeNull()
  })

  test.each([
    { accept: ['1', 2, 3], value: 4 },
    { accept: [1, 2, 3], value: 4 },
    { accept: [1, 2, 3, '4'], value: 4 },
  ])('invalid#%#', ({ accept, value }) => {
    const validator = new OneOfValidator(new OneOf(accept))

    expect(validator.validate(value)).toEqual({
      value,
      path: [],
    })
  })
})