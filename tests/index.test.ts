import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  Each,
  HasProperties,
} from '@/runners'

import {
  HasLength,
  IsDefined,
  IsString,
  OneOf,
} from '@/assertions'

import { validate } from '@/index'

describe('validate', () => {
  describe('HasProperties', () => {
    test('checks object\'s structure', async () => {
      const constraint = HasProperties({
        form: [
          IsDefined,
          HasProperties({
            nickname: IsString.That(HasLength({ min: 4 })),
            password: IsString.That(HasLength({ min: 6 })),
          }),
        ],
      })

      expect(await validate({
        form: {
          nickname: 'none',
          password: 'qwerty',
        },
      }, constraint)).toEqual([])

      expect(await validate({}, constraint)).toEqual([{
        value: undefined,
        path: ['form'],
        violates: '@modulify/validator/IsDefined',
        reason: 'undefined',
      }])

      expect(await validate({
        form: {
          nickname: '',
          password: '',
        },
      }, constraint)).toEqual([{
        value: '',
        path: ['form', 'nickname'],
        violates: '@modulify/validator/IsString',
        reason: 'min',
        meta: 4,
      }, {
        value: '',
        path: ['form', 'password'],
        violates: '@modulify/validator/IsString',
        reason: 'min',
        meta: 6,
      }])

      expect(await validate({
        nickname: 'none',
        password: 'qwerty',
      }, [
        Object.assign(async (value: unknown, path: PropertyKey[] = []) => {
          if (IsDefined(value)) return null

          return { value, path, violates: IsDefined.fqn }
        }, {
          fqn: IsDefined.fqn,
          bail: false,
        }),
        HasProperties({
          nickname: IsString.That(HasLength({ min: 4 })),
          password: IsString.That(HasLength({ min: 6 })),
        }),
      ])).toEqual([])
    })

    test('doesn\'t check non-object values', async () => {
      expect(await validate('', HasProperties({
        form: HasProperties({
          nickname: IsString.That(HasLength({ min: 4 })),
          password: IsString.That(HasLength({ min: 6 })),
        }),
      }))).toEqual([{
        value: '',
        path: [],
        violates: '@modulify/validator/HasProperties',
        reason: 'unsupported',
      }])
    })
  })

  describe('HasProperties & IsDefined', () => {
    test('checks object\'s structure', async () => {
      expect(await validate({}, HasProperties({
        form: [
          IsDefined,
          HasProperties({
            nickname: IsString.That(HasLength({ min: 4 })),
            password: IsString.That(HasLength({ min: 6 })),
          }),
        ],
      }))).toEqual([{
        value: undefined,
        path: ['form'],
        violates: '@modulify/validator/IsDefined',
        reason: 'undefined',
      }])
    })
  })

  describe('Each', () => {
    test('checks elements in array', async () => {
      expect(await validate([
        { name: '' },
        { name: 'tooLong' },
      ], Each([
        HasProperties({
          name: IsString.That(HasLength({ min: 4, max: 6 })),
        }),
      ]))).toEqual([{
        value: '',
        path: [0, 'name'],
        violates: '@modulify/validator/IsString',
        reason: 'min',
        meta: 4,
      }, {
        value: 'tooLong',
        path: [1, 'name'],
        violates: '@modulify/validator/IsString',
        reason: 'max',
        meta: 6,
      }])
    })

    test('checks single value', async () => {
      expect(await validate({ name: 'tooLong' }, Each([
        HasProperties({
          name: IsString.That(HasLength({ min: 4, max: 6 })),
        }),
      ]))).toEqual([{
        value: 'tooLong',
        path: ['name'],
        violates: '@modulify/validator/IsString',
        reason: 'max',
        meta: 6,
      }])
    })
  })

  test('OneOf', async () => {
    expect(await validate('', OneOf(['filled', 'outline', 'tonal']))).toEqual([{
      value: '',
      path: [],
      violates: '@modulify/validator/OneOf',
      meta: ['filled', 'outline', 'tonal'],
    }])
  })

  test('skips the rest constraints if the current one with bail flag fails', async () => {
    const _IsDefined = ({ bail }: { bail: boolean }) => {
      const fqn = '_IsDefined.bail=' + JSON.stringify(bail)

      return Object.assign(async (value: unknown, path: PropertyKey[] = []) => {
        if (IsDefined(value)) return null

        return { value, path, violates: fqn }
      }, { fqn, bail })
    }

    expect(await validate({
      form: {
        nickname: 'none',
        password: 'qwerty',
      },
    }, HasProperties({
      form: [
        _IsDefined({ bail: true }),
        HasProperties({
          nickname: IsString.That(HasLength({ min: 4 })),
          password: IsString.That(HasLength({ min: 6 })),
        }),
      ],
    }))).toEqual([])

    expect(await validate({}, HasProperties({
      form: [
        _IsDefined({ bail: true }),
        HasProperties({
          nickname: IsString.That(HasLength({ min: 4 })),
          password: IsString.That(HasLength({ min: 6 })),
        }),
      ],
    }))).toEqual([{
      value: undefined,
      path: ['form'],
      violates: '_IsDefined.bail=true',
    }])

    expect(await validate({}, HasProperties({
      form: [
        _IsDefined({ bail: false }),
        HasProperties({
          nickname: IsString.That(HasLength({ min: 4 })),
          password: IsString.That(HasLength({ min: 6 })),
        }),
      ],
    }))).toEqual([{
      value: undefined,
      path: ['form'],
      violates: '_IsDefined.bail=false',
    }, {
      value: undefined,
      path: ['form'],
      violates: '@modulify/validator/HasProperties',
      reason: 'unsupported',
    }])
  })

  test('returns special violation for rejected async validator', async () => {
    expect(await validate('', Object.assign(async () => Promise.reject('test rejection'), {
      fqn: 'This should not appear in the result',
      bail: false,
    }))).toEqual([{
      value: '',
      path: [],
      violates: '@modulify/validator',
      reason: 'reject',
      meta: 'test rejection',
    }])
  })
})

describe('validate.sync', () => {
  describe('HasProperties', () => {
    test('checks object\'s structure', () => {
      const constraint = HasProperties({
        form: [
          IsDefined,
          HasProperties({
            nickname: IsString.That(HasLength({ min: 4 })),
            password: IsString.That(HasLength({ min: 6 })),
          }),
        ],
      })

      expect(validate.sync({
        form: {
          nickname: 'none',
          password: 'qwerty',
        },
      }, constraint)).toEqual([])

      expect(validate.sync({}, constraint)).toEqual([{
        value: undefined,
        path: ['form'],
        violates: '@modulify/validator/IsDefined',
        reason: 'undefined',
      }])

      expect(validate.sync({
        form: {
          nickname: '',
          password: '',
        },
      }, constraint)).toEqual([{
        value: '',
        path: ['form', 'nickname'],
        violates: '@modulify/validator/IsString',
        reason: 'min',
        meta: 4,
      }, {
        value: '',
        path: ['form', 'password'],
        violates: '@modulify/validator/IsString',
        reason: 'min',
        meta: 6,
      }])
    })

    test('doesn\'t check non-object values', () => {
      expect(validate.sync('', HasProperties({
        form: HasProperties({
          nickname: IsString.That(HasLength({ min: 4 })),
          password: IsString.That(HasLength({ min: 6 })),
        }),
      }))).toEqual([{
        value: '',
        path: [],
        violates: '@modulify/validator/HasProperties',
        reason: 'unsupported',
      }])
    })
  })

  describe('HasProperties & IsDefined', () => {
    test('checks object\'s structure', () => {
      expect(validate.sync({}, HasProperties({
        form: [
          IsDefined,
          HasProperties({
            nickname: IsString.That(HasLength({ min: 4 })),
            password: IsString.That(HasLength({ min: 6 })),
          }),
        ],
      }))).toEqual([{
        value: undefined,
        path: ['form'],
        violates: '@modulify/validator/IsDefined',
        reason: 'undefined',
      }])
    })
  })

  describe('Each', () => {
    test('checks elements in array', () => {
      expect(validate.sync([
        { name: '' },
        { name: 'tooLong' },
      ], Each([
        HasProperties({
          name: IsString.That(HasLength({ min: 4, max: 6 })),
        }),
      ]))).toEqual([{
        value: '',
        path: [0, 'name'],
        violates: '@modulify/validator/IsString',
        reason: 'min',
        meta: 4,
      }, {
        value: 'tooLong',
        path: [1, 'name'],
        violates: '@modulify/validator/IsString',
        reason: 'max',
        meta: 6,
      }])
    })

    test('checks single value', () => {
      expect(validate.sync({ name: 'tooLong' }, Each([
        HasProperties({
          name: IsString.That(HasLength({ min: 4, max: 6 })),
        }),
      ]))).toEqual([{
        value: 'tooLong',
        path: ['name'],
        violates: '@modulify/validator/IsString',
        reason: 'max',
        meta: 6,
      }])
    })
  })

  test('OneOf', () => {
    expect(validate.sync('', OneOf(['filled', 'outline', 'tonal']))).toEqual([{
      value: '',
      path: [],
      violates: '@modulify/validator/OneOf',
      meta: ['filled', 'outline', 'tonal'],
    }])
  })

  test('throws error if found async validator', () => {
    const validator = Object.assign(async (value: unknown) => {
      return {
        value,
        violates: '__async__',
      }
    }, {
      fqn: '__async__',
      bail: false,
    })

    expect(() => {
      validate.sync('', validator)
    }).toThrowError('Found asynchronous constraint validator __async__')
  })
})
