import type {
  ValidationTuple,
  Violation,
} from '@/index'

import {
  describe,
  assertType,
  test,
} from 'vitest'

import {
  Each,
  HasProperties,
  isDefined,
  isString,
  validate,
} from '@/index'

describe('validate tuple types', () => {
  const profile = HasProperties({
    name: [isDefined, isString],
    tags: Each(isString),
  })

  test('returns a discriminated tuple for validate.sync', () => {
    const result = validate.sync({
      name: 'kirill',
      tags: ['ts'],
    }, profile)

    assertType<ValidationTuple<{
      name: string;
      tags: string[];
    }>>(result)
  })

  test('keeps tuple indexes correlated in the success branch', () => {
    const result = validate.sync({
      name: 'kirill',
      tags: ['ts'],
    }, profile)

    if (result[0]) {
      assertType<{ name: string; tags: string[] }>(result[1])
      assertType<[]>(result[2])
      void result[1].tags[0]?.toUpperCase()
    } else {
      assertType<unknown>(result[1])
      assertType<Violation[]>(result[2])

      // @ts-expect-error success-only property access must stay unavailable in the failure branch
      void result[1].tags
    }
  })

  test('keeps destructured tuple items correlated in the success branch', () => {
    const [ok, validated, violations] = validate.sync({
      name: 'kirill',
      tags: ['ts'],
    }, profile)

    if (ok) {
      assertType<{ name: string; tags: string[] }>(validated)
      assertType<[]>(violations)
      void validated.tags[0]?.toUpperCase()
    } else {
      assertType<unknown>(validated)
      assertType<Violation[]>(violations)

      // @ts-expect-error success-only property access must stay unavailable after destructuring
      void validated.tags
    }
  })

  test('keeps destructured tuple items correlated in the async failure branch', async () => {
    const [ok, validated, violations] = await validate({
      name: 'kirill',
      tags: [1],
    }, profile)

    if (!ok) {
      assertType<unknown>(validated)
      assertType<Violation[]>(violations)
    } else {
      assertType<{ name: string; tags: string[] }>(validated)
      assertType<[]>(violations)
      validated.name.toUpperCase()
    }
  })

  test('preserves the empty violations tuple in the async success branch', async () => {
    const [ok, validated, violations] = await validate({
      name: 'kirill',
      tags: ['ts', 'validation'],
    }, profile)

    if (ok) {
      assertType<{ name: string; tags: string[] }>(validated)
      assertType<[]>(violations)
    } else {
      assertType<Violation[]>(violations)
    }
  })
})
