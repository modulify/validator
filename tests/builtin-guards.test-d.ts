import type {
  InferConstraint,
  InferViolations,
  ValidationResult,
} from '@/index'

import {
  describe,
  expectTypeOf,
  test,
} from 'vitest'

import {
  hasValue,
  isError,
  isFiniteNumber,
  isInteger,
  isPromiseLike,
  isRegExp,
  isSafeInteger,
  isValidDate,
  multipleOf,
  validate,
} from '@/index'
import { isPromiseLike as isPromiseLikePredicate } from '@/predicates'

describe('built-in guard types', () => {
  test('preserves the narrowed domain and dedicated violation code of every new guard', () => {
    expectTypeOf<InferConstraint<typeof isError>>().toEqualTypeOf<Error>()
    expectTypeOf<InferConstraint<typeof isFiniteNumber>>().toEqualTypeOf<number>()
    expectTypeOf<InferConstraint<typeof isInteger>>().toEqualTypeOf<number>()
    expectTypeOf<InferConstraint<typeof isPromiseLike>>().toEqualTypeOf<PromiseLike<unknown>>()
    expectTypeOf<InferConstraint<typeof isRegExp>>().toEqualTypeOf<RegExp>()
    expectTypeOf<InferConstraint<typeof isSafeInteger>>().toEqualTypeOf<number>()
    expectTypeOf<InferConstraint<typeof isValidDate>>().toEqualTypeOf<Date>()

    expectTypeOf<InferViolations<typeof isError>['violates']['code']>().toEqualTypeOf<'type.error'>()
    expectTypeOf<InferViolations<typeof isFiniteNumber>['violates']['code']>().toEqualTypeOf<'number.finite'>()
    expectTypeOf<InferViolations<typeof isInteger>['violates']['code']>().toEqualTypeOf<'number.integer'>()
    expectTypeOf<InferViolations<typeof isPromiseLike>['violates']['code']>().toEqualTypeOf<'type.promise-like'>()
    expectTypeOf<InferViolations<typeof isRegExp>['violates']['code']>().toEqualTypeOf<'type.regexp'>()
    expectTypeOf<InferViolations<typeof isSafeInteger>['violates']['code']>().toEqualTypeOf<'number.safe-integer'>()
    expectTypeOf<InferViolations<typeof isValidDate>['violates']['code']>().toEqualTypeOf<'date.valid'>()
    expectTypeOf<InferViolations<typeof isInteger>['violates']['args']>().toMatchTypeOf<readonly []>()
  })

  test('numeric guards establish domains for bounded and multiple-of refinements', () => {
    const finite = validate.sync(4, [isFiniteNumber, hasValue({ min: 1 })])
    const integer = validate.sync(4, [isInteger, multipleOf(2)])
    const safeInteger = validate.sync(4, [isSafeInteger, hasValue({ max: 10 })])

    expectTypeOf(finite).toMatchTypeOf<ValidationResult<number>>()
    expectTypeOf(integer).toMatchTypeOf<ValidationResult<number>>()
    expectTypeOf(safeInteger).toMatchTypeOf<ValidationResult<number>>()
    expectTypeOf<(typeof integer)[2][number]['violates']['code']>().toEqualTypeOf<'number.integer' | 'number.multiple-of'>()
  })

  test('promise-like predicates narrow to unknown unless a value type is provided', () => {
    const value: unknown = {}

    if (isPromiseLikePredicate(value)) {
      expectTypeOf(value).toEqualTypeOf<PromiseLike<unknown>>()
    }

    if (isPromiseLikePredicate<string>(value)) {
      expectTypeOf(value).toEqualTypeOf<PromiseLike<string>>()
    }
  })
})
