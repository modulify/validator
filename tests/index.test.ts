import type { Assertion } from '~types'

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
  assert,
  hasLength,
  isDefined,
  isString,
  oneOf,
} from '@/assertions'

import { validate } from '@/index'

const valid = <T>(value: T) => [true, value, []]
const invalid = <T>(value: T, violations: unknown[]) => [false, value, violations]

const createAsyncAssertion = (
  name: string,
  handler: (value: unknown) => Promise<ReturnType<Assertion>>,
  bail = false
): Assertion => {
  const assertion = (async (value: unknown) => handler(value)) as Assertion

  Object.defineProperties(assertion, {
    name: {
      configurable: true,
      value: name,
    },
    bail: {
      enumerable: true,
      value: bail,
    },
    constraints: {
      enumerable: true,
      value: [],
    },
    check: {
      enumerable: true,
      value: (_value: unknown): _value is unknown => true,
    },
  })

  return assertion
}

describe('validate', () => {
  describe('HasProperties', () => {
    test('checks object structure', async () => {
      const constraint = HasProperties({
        form: [
          isDefined,
          HasProperties({
            nickname: [isString, hasLength({ min: 4 })],
            password: [isString, hasLength({ min: 6 })],
          }),
        ],
      })

      expect(await validate({
        form: {
          nickname: 'none',
          password: 'qwerty',
        },
      }, constraint)).toEqual(valid({
        form: {
          nickname: 'none',
          password: 'qwerty',
        },
      }))

      expect(await validate({}, constraint)).toEqual(invalid({}, [{
        value: undefined,
        path: ['form'],
        violates: {
          predicate: 'isDefined',
          rule: 'undefined',
          args: [],
        },
      }]))

      expect(await validate({
        form: {
          nickname: '',
          password: '',
        },
      }, constraint)).toEqual(invalid({
        form: {
          nickname: '',
          password: '',
        },
      }, [{
        value: '',
        path: ['form', 'nickname'],
        violates: {
          predicate: 'hasLength',
          rule: 'min',
          args: [4],
        },
      }, {
        value: '',
        path: ['form', 'password'],
        violates: {
          predicate: 'hasLength',
          rule: 'min',
          args: [6],
        },
      }]))
    })

    test('does not check non-object values', async () => {
      expect(await validate('', HasProperties({
        form: HasProperties({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      }))).toEqual(invalid('', [{
        value: '',
        path: [],
        violates: {
          predicate: 'isRecord',
          rule: 'HasProperties',
          args: [],
        },
      }]))
    })
  })

  describe('Each', () => {
    test('checks elements in array', async () => {
      expect(await validate([
        { name: '' },
        { name: 'tooLong' },
      ], Each([
        HasProperties({
          name: [isString, hasLength({ min: 4, max: 6 })],
        }),
      ]))).toEqual(invalid([
        { name: '' },
        { name: 'tooLong' },
      ], [{
        value: '',
        path: [0, 'name'],
        violates: {
          predicate: 'hasLength',
          rule: 'min',
          args: [4],
        },
      }, {
        value: 'tooLong',
        path: [1, 'name'],
        violates: {
          predicate: 'hasLength',
          rule: 'max',
          args: [6],
        },
      }]))
    })

    test('rejects non-array values', async () => {
      expect(await validate({ name: 'tooLong' }, Each([
        HasProperties({
          name: [isString, hasLength({ min: 4, max: 6 })],
        }),
      ]))).toEqual(invalid({ name: 'tooLong' }, [{
        value: { name: 'tooLong' },
        path: [],
        violates: {
          predicate: 'isArray',
          rule: 'Each',
          args: [],
        },
      }]))
    })
  })

  test('oneOf', async () => {
    expect(await validate('', oneOf(['filled', 'outline', 'tonal']))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'oneOf',
        rule: 'oneOf',
        args: [['filled', 'outline', 'tonal']],
      },
    }]))
  })

  test('skips the rest constraints if the current one with bail flag fails', async () => {
    const makeDefined = ({ bail }: { bail: boolean }) => assert(
      (value: unknown): value is Exclude<unknown, undefined> => value !== undefined,
      {
        name: `_isDefined.bail=${JSON.stringify(bail)}`,
        bail,
      }
    )

    expect(await validate({
      form: {
        nickname: 'none',
        password: 'qwerty',
      },
    }, HasProperties({
      form: [
        makeDefined({ bail: true }),
        HasProperties({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      ],
    }))).toEqual(valid({
      form: {
        nickname: 'none',
        password: 'qwerty',
      },
    }))

    expect(await validate({}, HasProperties({
      form: [
        makeDefined({ bail: true }),
        HasProperties({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      ],
    }))).toEqual(invalid({}, [{
      value: undefined,
      path: ['form'],
      violates: {
        predicate: '_isDefined.bail=true',
        rule: '_isDefined.bail=true',
        args: [],
      },
    }]))

    expect(await validate({}, HasProperties({
      form: [
        makeDefined({ bail: false }),
        HasProperties({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      ],
    }))).toEqual(invalid({}, [{
      value: undefined,
      path: ['form'],
      violates: {
        predicate: '_isDefined.bail=false',
        rule: '_isDefined.bail=false',
        args: [],
      },
    }, {
      value: undefined,
      path: ['form'],
      violates: {
          predicate: 'isRecord',
          rule: 'HasProperties',
          args: [],
        },
    }]))
  })

  test('returns special violation for rejected async validator', async () => {
    expect(await validate('', createAsyncAssertion('rejectingAssertion', async () => Promise.reject('test rejection')))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'settle',
        rule: 'reject',
        args: ['test rejection'],
      },
    }]))
  })

  test('awaits async assertions with bail and stops further checks on failure', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncBail', async (value: unknown) => ({
        value,
        violates: {
          predicate: 'asyncBail',
          rule: 'asyncBail',
          args: [],
        },
      }), true),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'asyncBail',
        rule: 'asyncBail',
        args: [],
      },
    }]))
  })

  test('collects violations from async assertions without bail', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncNoBail', async (value: unknown) => ({
        value,
        violates: {
          predicate: 'asyncNoBail',
          rule: 'asyncNoBail',
          args: [],
        },
      })),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'asyncNoBail',
        rule: 'asyncNoBail',
        args: [],
      },
    }, {
      value: '',
      path: [],
      violates: {
        predicate: 'hasLength',
        rule: 'min',
        args: [2],
      },
    }]))
  })

  test('continues after async bail assertions that succeed', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncBailPass', async () => null, true),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'hasLength',
        rule: 'min',
        args: [2],
      },
    }]))
  })

  test('ignores async assertions without bail when they return null', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncNoBailPass', async () => null),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'hasLength',
        rule: 'min',
        args: [2],
      },
    }]))
  })
})

describe('validate.sync', () => {
  describe('HasProperties', () => {
    test('checks object structure', () => {
      const constraint = HasProperties({
        form: [
          isDefined,
          HasProperties({
            nickname: [isString, hasLength({ min: 4 })],
            password: [isString, hasLength({ min: 6 })],
          }),
        ],
      })

      expect(validate.sync({
        form: {
          nickname: 'none',
          password: 'qwerty',
        },
      }, constraint)).toEqual(valid({
        form: {
          nickname: 'none',
          password: 'qwerty',
        },
      }))

      expect(validate.sync({}, constraint)).toEqual(invalid({}, [{
        value: undefined,
        path: ['form'],
        violates: {
          predicate: 'isDefined',
          rule: 'undefined',
          args: [],
        },
      }]))

      expect(validate.sync({
        form: {
          nickname: '',
          password: '',
        },
      }, constraint)).toEqual(invalid({
        form: {
          nickname: '',
          password: '',
        },
      }, [{
        value: '',
        path: ['form', 'nickname'],
        violates: {
          predicate: 'hasLength',
          rule: 'min',
          args: [4],
        },
      }, {
        value: '',
        path: ['form', 'password'],
        violates: {
          predicate: 'hasLength',
          rule: 'min',
          args: [6],
        },
      }]))
    })

    test('does not check non-object values', () => {
      expect(validate.sync('', HasProperties({
        form: HasProperties({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      }))).toEqual(invalid('', [{
        value: '',
        path: [],
        violates: {
          predicate: 'isRecord',
          rule: 'HasProperties',
          args: [],
        },
      }]))
    })
  })

  describe('Each', () => {
    test('checks elements in array', () => {
      expect(validate.sync([
        { name: '' },
        { name: 'tooLong' },
      ], Each([
        HasProperties({
          name: [isString, hasLength({ min: 4, max: 6 })],
        }),
      ]))).toEqual(invalid([
        { name: '' },
        { name: 'tooLong' },
      ], [{
        value: '',
        path: [0, 'name'],
        violates: {
          predicate: 'hasLength',
          rule: 'min',
          args: [4],
        },
      }, {
        value: 'tooLong',
        path: [1, 'name'],
        violates: {
          predicate: 'hasLength',
          rule: 'max',
          args: [6],
        },
      }]))
    })

    test('rejects non-array values', () => {
      expect(validate.sync({ name: 'tooLong' }, Each([
        HasProperties({
          name: [isString, hasLength({ min: 4, max: 6 })],
        }),
      ]))).toEqual(invalid({ name: 'tooLong' }, [{
        value: { name: 'tooLong' },
        path: [],
        violates: {
          predicate: 'isArray',
          rule: 'Each',
          args: [],
        },
      }]))
    })
  })

  test('oneOf', () => {
    expect(validate.sync('', oneOf(['filled', 'outline', 'tonal']))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: {
        predicate: 'oneOf',
        rule: 'oneOf',
        args: [['filled', 'outline', 'tonal']],
      },
    }]))
  })

  test('throws error if found async validator', () => {
    const asyncAssertion = createAsyncAssertion('__async__', async (value: unknown) => ({
      value,
      violates: {
        predicate: '__async__',
        rule: '__async__',
        args: [],
      },
    }))

    expect(() => {
      validate.sync('', asyncAssertion)
    }).toThrowError('Found asynchronous validator __async__')
  })
})
