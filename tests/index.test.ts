import {
  describe,
  expect,
  test,
} from '@jest/globals'

import Collection from '@/constraints/Collection'
import Exists from '@/constraints/Exists'
import Length from '@/constraints/Length'
import OneOf from '@/constraints/OneOf'

import validate from '@/index'

describe('validate', () => {
  test('Collection', () => {
    expect(validate({
      form: {
        nickname: '',
        password: '',
      },
    }, new Collection({
      form: [
        new Exists(),
        new Collection({
          nickname: new Length({ min: 4 }),
          password: new Length({ min: 6 }),
        }),
      ],
    }))).toEqual([{
      by: '@modulify/validator/Length',
      value: '',
      path: ['form', 'nickname'],
      reason: 'min',
      meta: 4,
    }, {
      by: '@modulify/validator/Length',
      value: '',
      path: ['form', 'password'],
      reason: 'min',
      meta: 6,
    }])
  })

  test('OneOf', () => {
    expect(validate('', new OneOf(['filled', 'outline', 'tonal']))).toEqual([{
      by: '@modulify/validator/OneOf',
      value: '',
      path: [],
    }])
  })
})