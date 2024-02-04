import {
  Constraint,
  ConstraintValidator,
  ConstraintViolation,
  Key,
  Provider,
} from '../types'

import {
  describe,
  expect,
  test,
} from '@jest/globals'

import Collection from '@/constraints/Collection'
import Exists from '@/constraints/Exists'
import Length from '@/constraints/Length'
import OneOf from '@/constraints/OneOf'

import {
  ProviderChain,
  createValidator,
} from '@/index'

describe('validate', () => {
  const validator = createValidator()

  test('Collection', () => {
    expect(validator.validate({
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
    expect(validator.validate('', new OneOf(['filled', 'outline', 'tonal']))).toEqual([{
      by: '@modulify/validator/OneOf',
      value: '',
      path: [],
    }])
  })
})

describe('overrides', () => {
  const validator = createValidator()

  class Email implements Constraint {
    public readonly name = '@app/validator/Email'

    toViolation (value: unknown, path: Key[]): ConstraintViolation {
      return {
        by: this.name,
        value,
        path,
      }
    }
  }

  class EmailValidator implements ConstraintValidator {
    private readonly _constraint: Email

    constructor (constraint: Email) {
      this._constraint = constraint
    }

    validate (value: unknown, path?: Key[]): ConstraintViolation | null {
      if (!(typeof value === 'string') || !/\S+@\S+\.\S+/.test(value)) {
        return this._constraint.toViolation(value, path)
      }

      return null
    }
  }

  test('does not use unknown rules', () => {
    expect(() => {
      validator.validate('my@test.test', new Email())
    }).toThrow('No validator for constraint @app/validator/Email')
  })

  test('uses new rules', () => {
    const overridden = validator.override(new class implements Provider {
      get (constraint: Constraint) {
        return constraint instanceof Email ? new EmailValidator(constraint) : null
      }

      override (provider: Provider): Provider {
        return new ProviderChain(provider, this)
      }
    })

    expect(overridden.validate('my@test.test', new Email())).toEqual([])

    expect(overridden.validate(
      { email: 'not-email' },
      new Collection({ email: new Email() })
    )).toEqual([{
      by: '@app/validator/Email',
      value: 'not-email',
      path: ['email'],
    }])
  })
})