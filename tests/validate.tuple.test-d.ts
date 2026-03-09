import type {
  Guard,
  Refinement,
  ValidationResult,
  Violation,
} from '~types'

import {
  describe,
  assertType,
  test,
} from 'vitest'

import {
  collection,
  each,
  hasLength,
  isNumber,
  shape,
  isDefined,
  isString,
  validate,
} from '@/index'

describe('validate tuple types', () => {
  test('built-in assertions expose staged public types', () => {
    assertType<Guard<string>>(isString)
    assertType<Refinement<string | unknown[]>>(hasLength({ min: 3 }))
  })

  const profile = shape({
    name: [isDefined, isString],
    tags: each(isString),
  })

  test('returns a discriminated tuple for validate.sync', () => {
    const result = validate.sync({
      name: 'kirill',
      tags: ['ts'],
    }, profile)

    assertType<ValidationResult<{
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

  test('narrows violation payloads by code inside ViolationCollection.map', () => {
    const [ok, , violations] = validate.sync('ab', [isString, hasLength({ min: 3 })])

    if (!ok) {
      const messages = collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'type.string':
            assertType<'isString'>(violation.violates.name)
            assertType<[]>(violation.violates.args)
            return violation.violates.name
          case 'length.min':
            assertType<'hasLength'>(violation.violates.name)
            assertType<readonly [min: number]>(violation.violates.args)
            return String(violation.violates.args[0])
          default:
            assertType<never>(violation.violates)
            return violation.violates
        }
      })

      assertType<string[]>(messages)
    }
  })

  test('accepts staged tuples after a compatible guard prefix', () => {
    const result = validate.sync('abcd', [isDefined, isString, hasLength({ min: 3 })])

    assertType<ValidationResult<string>>(result)
  })

  test('rejects incompatible clarifying assertions in tuples', () => {
    // @ts-expect-error incompatible clarifying assertion
    validate.sync(12, [isNumber, hasLength({ min: 3 })] as const)
  })

  test('rejects tuples that start with a clarifying assertion', () => {
    // @ts-expect-error clarifying assertions require an established domain
    validate.sync('abc', [hasLength({ min: 3 })] as const)
  })

  test('rejects standalone clarifying assertions in validation APIs', () => {
    // @ts-expect-error clarifying assertions are not standalone validation constraints
    validate.sync('abc', hasLength({ min: 3 }))
  })
})
