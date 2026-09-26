import {
  assertType,
  describe,
  test,
} from 'vitest'

import {
  collection,
  hasLength,
  hasSize,
  hasValue,
  isInteger,
  isNumber,
  isValidDate,
  isSet,
  isString,
  multipleOf,
  validate,
} from '@/index'
import { describe as describeConstraint } from '@/index'

describe('parameterized assertion violation types', () => {
  test('hasLength({ min: 3 }) keeps only supported violation codes', () => {
    const [ok, , violations] = validate.sync('ab', [isString, hasLength({ min: 3 })])

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'type.string':
            assertType<[]>(violation.violates.args)
            return violation.violates.name
          case 'length.min':
            assertType<3>(violation.violates.args[0])
            return violation.violates.args[0]
          default:
            assertType<never>(violation.violates)
            return violation.violates
        }
      })
    }
  })

  test('hasLength({ min: 3, max: 5 }) keeps only the enabled range branches', () => {
    const [ok, , violations] = validate.sync('abcdef', [isString, hasLength({ min: 3, max: 5 })])

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'type.string':
            return violation.violates.name
          case 'length.min':
            return violation.violates.args[0]
          case 'length.max':
            return violation.violates.args[0]
          default:
            assertType<never>(violation.violates)
            return violation.violates
        }
      })
    }
  })

  test('hasSize({ exact: 2 }) excludes unrelated size branches', () => {
    const [ok, , violations] = validate.sync(new Set([1]), [isSet, hasSize({ exact: 2 })])

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'type.set':
            return violation.violates.name
          case 'size.exact':
            assertType<2>(violation.violates.args[0])
            return violation.violates.args[0]
          default:
            assertType<never>(violation.violates)
            return violation.violates
        }
      })
    }
  })

  test('hasValue({ range: [1, 10] }) excludes exact/min/max branches', () => {
    const [ok, , violations] = validate.sync(11, [isNumber, hasValue({ range: [1, 10] as const })])

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'type.number':
            return violation.violates.name
          case 'number.range':
            assertType<readonly [1, 10]>(violation.violates.args[0])
            return violation.violates.args[0]
          default:
            assertType<never>(violation.violates)
            return violation.violates
        }
      })
    }
  })

  test('multipleOf(5) keeps the exact step in violation args', () => {
    const [ok, , violations] = validate.sync(12, [isNumber, multipleOf(5)])

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'type.number':
            return violation.violates.name
          case 'number.multiple-of':
            assertType<5>(violation.violates.args[0])
            return violation.violates.args[0]
          default:
            assertType<never>(violation.violates)
            return violation.violates
        }
      })
    }
  })

  test('standalone integer and valid-date assertions preserve dedicated descriptor codes', () => {
    const integerDescriptor = describeConstraint(isInteger)
    const validDateDescriptor = describeConstraint(isValidDate)

    if (integerDescriptor.kind === 'assertion') {
      assertType<'number.integer'>(integerDescriptor.code)
      assertType<readonly []>(integerDescriptor.args)
    }

    if (validDateDescriptor.kind === 'assertion') {
      assertType<'date.valid'>(validDateDescriptor.code)
      assertType<readonly []>(validDateDescriptor.args)
    }
  })
})
