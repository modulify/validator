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
import Each from '@/constraints/Each'
import Exists from '@/constraints/Exists'
import Length from '@/constraints/Length'
import OneOf from '@/constraints/OneOf'

import {
  ProviderChain,
  createValidator,
} from '@/index'

describe('validates synchronously', () => {
  const validator = createValidator()

  describe('Collection', () => {
    test('checks object\'s structure', () => {
      expect(validator.validate({
        form: {
          nickname: '',
          password: '',
        },
      }, new Collection({
        form: [
          new Collection({
            nickname: new Length({ min: 4 }),
            password: new Length({ min: 6 }),
          }),
        ],
      }), false)).toEqual([{
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

    test('doesn\'t check non-object values', () => {
      expect(validator.validate('', new Collection<unknown>({
        form: new Collection({
          nickname: new Length({ min: 4 }),
          password: new Length({ min: 6 }),
        }),
      }), false)).toEqual([{
        by: '@modulify/validator/Collection',
        value: '',
        path: [],
        reason: 'unsupported',
      }])
    })
  })

  describe('Collection & Exists', () => {
    test('checks object\'s structure', () => {
      expect(validator.validate({}, new Collection<unknown>({
        form: [
          new Exists(),
          new Collection({
            nickname: new Length({ min: 4 }),
            password: new Length({ min: 6 }),
          }),
        ],
      }), false)).toEqual([{
        by: '@modulify/validator/Exists',
        value: undefined,
        path: ['form'],
        reason: 'undefined',
      }])
    })
  })

  describe('Each', () => {
    test('checks elements in array', () => {
      expect(validator.validate([
        { name: '' },
        { name: 'longEnough' },
      ], new Each([
        new Collection({
          name: new Length({ min: 4, max: 6 }),
        }),
      ]), false)).toEqual([{
        by: '@modulify/validator/Length',
        value: '',
        path: [0, 'name'],
        reason: 'min',
        meta: 4,
      }, {
        by: '@modulify/validator/Length',
        value: 'longEnough',
        path: [1, 'name'],
        reason: 'max',
        meta: 6,
      }])
    })

    test('checks single value', () => {
      expect(validator.validate({ name: 'longEnough' }, new Each([
        new Collection({
          name: new Length({ min: 4, max: 6 }),
        }),
      ]), false)).toEqual([{
        by: '@modulify/validator/Length',
        value: 'longEnough',
        path: ['name'],
        reason: 'max',
        meta: 6,
      }])
    })
  })

  test('OneOf', () => {
    expect(validator.validate('', new OneOf(['filled', 'outline', 'tonal']), false)).toEqual([{
      by: '@modulify/validator/OneOf',
      value: '',
      path: [],
      meta: ['filled', 'outline', 'tonal'],
    }])
  })
})

describe('validates asynchronously', () => {
  const validator = createValidator()

  describe('Collection', () => {
    test('checks object\'s structure', async () => {
      expect(await validator.validate({
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

    test('doesn\'t check non-object values', async () => {
      expect(await validator.validate('', new Collection<unknown>({
        form: new Collection({
          nickname: new Length({ min: 4 }),
          password: new Length({ min: 6 }),
        }),
      }))).toEqual([{
        by: '@modulify/validator/Collection',
        value: '',
        path: [],
        reason: 'unsupported',
      }])
    })
  })

  describe('Collection & Exists', () => {
    test('checks object\'s structure', async () => {
      expect(await validator.validate({}, new Collection<unknown>({
        form: [
          new Exists(),
          new Collection({
            nickname: new Length({ min: 4 }),
            password: new Length({ min: 6 }),
          }),
        ],
      }))).toEqual([{
        by: '@modulify/validator/Exists',
        value: undefined,
        path: ['form'],
        reason: 'undefined',
      }])
    })
  })

  describe('Each', () => {
    test('checks elements in array', async () => {
      expect(await validator.validate([
        { name: '' },
        { name: 'longEnough' },
      ], new Each([
        new Collection({
          name: new Length({ min: 4, max: 6 }),
        }),
      ]))).toEqual([{
        by: '@modulify/validator/Length',
        value: '',
        path: [0, 'name'],
        reason: 'min',
        meta: 4,
      }, {
        by: '@modulify/validator/Length',
        value: 'longEnough',
        path: [1, 'name'],
        reason: 'max',
        meta: 6,
      }])
    })

    test('checks single value', async () => {
      expect(await validator.validate({ name: 'longEnough' }, new Each([
        new Collection({
          name: new Length({ min: 4, max: 6 }),
        }),
      ]))).toEqual([{
        by: '@modulify/validator/Length',
        value: 'longEnough',
        path: ['name'],
        reason: 'max',
        meta: 6,
      }])
    })
  })

  test('OneOf', async () => {
    expect(await validator.validate('', new OneOf(['filled', 'outline', 'tonal']))).toEqual([{
      by: '@modulify/validator/OneOf',
      value: '',
      path: [],
      meta: ['filled', 'outline', 'tonal'],
    }])
  })
})

describe('override', () => {
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

  class AsyncEmailValidator implements ConstraintValidator {
    private readonly _constraint: Email

    constructor (constraint: Email) {
      this._constraint = constraint
    }

    validate (value: unknown, path?: Key[]): Promise<ConstraintViolation | null> {
      if (!(typeof value === 'string') || !/\S+@\S+\.\S+/.test(value)) {
        return Promise.resolve(this._constraint.toViolation(value, path))
      }

      return Promise.resolve(null)
    }
  }

  test('fails if some rules are unknown', () => {
    expect(() => {
      validator.validate('my@test.test', new Email(), false)
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

    expect(overridden.validate('my@test.test', new Email(), false)).toEqual([])

    expect(overridden.validate(
      { email: 'not-email' },
      new Collection({ email: new Email() }),
      false
    )).toEqual([{
      by: '@app/validator/Email',
      value: 'not-email',
      path: ['email'],
    }])
  })

  test('uses new asynchronous rules', async () => {
    const overridden = validator.override(new class implements Provider {
      get (constraint: Constraint) {
        return constraint instanceof Email ? new AsyncEmailValidator(constraint) : null
      }

      override (provider: Provider): Provider {
        return new ProviderChain(provider, this)
      }
    })

    expect(await overridden.validate('my@test.test', new Email())).toEqual([])

    expect(await overridden.validate(
      { email: 'not-email' },
      new Collection({ email: new Email() })
    )).toEqual([{
      by: '@app/validator/Email',
      value: 'not-email',
      path: ['email'],
    }])
  })
})