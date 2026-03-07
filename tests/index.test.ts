import type {
  Assertion,
  ViolationSubject,
} from '~types'

import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  shape,
} from '@/combinators'

import {
  assert,
  hasLength,
  isString,
  oneOf,
} from '@/assertions'

import { validate } from '@/index'

const valid = <T>(value: T) => [true, value, []]
const invalid = <T>(value: T, violations: unknown[]) => [false, value, violations]
const assertionSubject = (name: string, code: string, args: unknown[] = []): ViolationSubject => ({ kind: 'assertion', name, code, args })
const validatorSubject = (name: string, code: string, args: unknown[] = []): ViolationSubject => ({ kind: 'validator', name, code, args })
const runtimeSubject = (name: string, code: string, args: unknown[] = []): ViolationSubject => ({ kind: 'runtime', name, code, args })

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
  test('oneOf', async () => {
    expect(await validate('', oneOf(['filled', 'outline', 'tonal']))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('oneOf', 'value.one-of', [['filled', 'outline', 'tonal']]),
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
    }, shape({
      form: [
        makeDefined({ bail: true }),
        shape({
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

    expect(await validate({}, shape({
      form: [
        makeDefined({ bail: true }),
        shape({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      ],
    }))).toEqual(invalid({}, [{
      value: undefined,
      path: ['form'],
      violates: assertionSubject('_isDefined.bail=true', '_isDefined.bail=true'),
    }]))

    expect(await validate({}, shape({
      form: [
        makeDefined({ bail: false }),
        shape({
          nickname: [isString, hasLength({ min: 4 })],
          password: [isString, hasLength({ min: 6 })],
        }),
      ],
    }))).toEqual(invalid({}, [{
      value: undefined,
      path: ['form'],
      violates: assertionSubject('_isDefined.bail=false', '_isDefined.bail=false'),
    }, {
      value: undefined,
      path: ['form'],
      violates: validatorSubject('shape', 'type.record'),
    }]))
  })

  test('returns special violation for rejected async validator', async () => {
    expect(await validate('', createAsyncAssertion('rejectingAssertion', async () => Promise.reject('test rejection')))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: runtimeSubject('validate', 'runtime.rejection', ['test rejection']),
    }]))
  })

  test('awaits async assertions with bail and stops further checks on failure', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncBail', async (value: unknown) => ({
        value,
        violates: assertionSubject('asyncBail', 'asyncBail'),
      }), true),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('asyncBail', 'asyncBail'),
    }]))
  })

  test('collects violations from async assertions without bail', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncNoBail', async (value: unknown) => ({
        value,
        violates: assertionSubject('asyncNoBail', 'asyncNoBail'),
      })),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('asyncNoBail', 'asyncNoBail'),
    }, {
      value: '',
      path: [],
      violates: assertionSubject('hasLength', 'length.min', [2]),
    }]))
  })

  test('continues after async bail assertions that succeed', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncBailPass', async () => null, true),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('hasLength', 'length.min', [2]),
    }]))
  })

  test('ignores async assertions without bail when they return null', async () => {
    expect(await validate('', [
      createAsyncAssertion('asyncNoBailPass', async () => null),
      hasLength({ min: 2 }),
    ])).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('hasLength', 'length.min', [2]),
    }]))
  })
})

describe('validate.sync', () => {
  test('oneOf', () => {
    expect(validate.sync('', oneOf(['filled', 'outline', 'tonal']))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('oneOf', 'value.one-of', [['filled', 'outline', 'tonal']]),
    }]))
  })

  test('throws error if found async validator', () => {
    const asyncAssertion = createAsyncAssertion('__async__', async (value: unknown) => ({
      value,
      violates: assertionSubject('__async__', '__async__'),
    }))

    expect(() => {
      validate.sync('', asyncAssertion)
    }).toThrowError('Found asynchronous validator __async__')
  })
})
