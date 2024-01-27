import { expect, test } from '@jest/globals'

import validate from '@/index'

import Collection from '@/constraints/Collection'
import Exists from '@/constraints/Exists'
import Length from '@/constraints/Length'
import OneOf from '@/constraints/OneOf'

test('validate', () => {
  expect(validate({
    appearance: '',
  }, new Collection({
    appearance: new OneOf(['filled', 'outline', 'tonal']),
  }))).toEqual([{ value: '', path: ['appearance'] }])

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
    value: '', path: ['form', 'nickname'], reason: 'min',
  }, {
    value: '', path: ['form', 'password'], reason: 'min',
  }])
})