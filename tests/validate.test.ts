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
  each,
  shape,
} from '@/combinators'

import {
  assert,
  hasLength,
  isDefined,
  isString,
  oneOf,
} from '@/assertions'

import { validate } from '@/index'

const expectProfile = <T extends { name: string; tags: string[] }>(value: T) => value
const valid = <T>(value: T) => [true, value, []]
const invalid = <T>(value: T, violations: unknown[]) => [false, value, violations]
const assertionSubject = <C extends string, A extends readonly unknown[] = readonly unknown[]>(
  name: string,
  code: C,
  args: A = [] as unknown as A
): ViolationSubject<A, 'assertion', C> => ({ kind: 'assertion', name, code, args }) as unknown as ViolationSubject<
  A,
  'assertion',
  C
>
const validatorSubject = <C extends string, A extends readonly unknown[] = readonly unknown[]>(
  name: string,
  code: C,
  args: A = [] as unknown as A
): ViolationSubject<A, 'validator', C> => ({ kind: 'validator', name, code, args }) as unknown as ViolationSubject<
  A,
  'validator',
  C
>
const runtimeSubject = <C extends string, A extends readonly unknown[] = readonly unknown[]>(
  name: string,
  code: C,
  args: A = [] as unknown as A
): ViolationSubject<A, 'runtime', C> => ({ kind: 'runtime', name, code, args }) as unknown as ViolationSubject<
  A,
  'runtime',
  C
>

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
  const profile = shape({
    name: [isDefined, isString],
    tags: each(isString),
  })

  test('oneOf', async () => {
    expect(await validate('', oneOf(['filled', 'outline', 'tonal']))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('oneOf', 'value.one-of', [['filled', 'outline', 'tonal']]),
    }]))
  })

  test('returns typed async success branch through destructuring', async () => {
    const [ok, validated, violations] = await validate({
      name: 'kirill',
      tags: ['ts'],
    }, profile)

    expect(ok).toBe(true)

    if (ok) {
      expectProfile(validated)
      expect(violations).toEqual([])
      expect(validated.name.toUpperCase()).toBe('KIRILL')
    }
  })

  test('keeps tuple items correlated after destructuring in the failure branch', async () => {
    const [ok, validated, violations] = await validate({
      name: 'kirill',
      tags: [1],
    }, profile)

    expect(ok).toBe(false)

    if (!ok) {
      expect(validated).toEqual({
        name: 'kirill',
        tags: [1],
      })
      expect(violations).toEqual([{
        value: 1,
        path: ['tags', 0],
        violates: assertionSubject('isString', 'type.string'),
      }])
    }
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
  const profile = shape({
    name: [isDefined, isString],
    tags: each(isString),
  })

  test('oneOf', () => {
    expect(validate.sync('', oneOf(['filled', 'outline', 'tonal']))).toEqual(invalid('', [{
      value: '',
      path: [],
      violates: assertionSubject('oneOf', 'value.one-of', [['filled', 'outline', 'tonal']]),
    }]))
  })

  test('returns typed sync success branch through the validated tuple item', () => {
    const [ok, validated, violations] = validate.sync({
      name: 'kirill',
      tags: ['ts', 'validation'],
    }, profile)

    expect(ok).toBe(true)

    if (ok) {
      expectProfile(validated)
      expect(violations).toEqual([])
      expect(validated.tags[0]?.toUpperCase()).toBe('TS')
    }
  })

  test('returns sync failure branch with the original value and violations', () => {
    const [ok, validated, violations] = validate.sync({
      name: 'kirill',
      tags: 'ts',
    }, profile)

    expect(ok).toBe(false)
    expect(validated).toEqual({
      name: 'kirill',
      tags: 'ts',
    })
    expect(violations).toEqual([{
      value: 'ts',
      path: ['tags'],
      violates: validatorSubject('each', 'type.array'),
    }])
  })

  test('exports reusable shapes from the package root', () => {
    const schema = shape({
      name: [isDefined, isString],
    }).strict()

    expect(validate.sync({
      name: 'kirill',
    }, schema)).toEqual([true, {
      name: 'kirill',
    }, []])
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
