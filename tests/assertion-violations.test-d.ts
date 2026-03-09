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
  multipleOf,
  validate,
} from '@/index'

describe('parameterized assertion violation types', () => {
  test('hasLength({ min: 3 }) keeps only supported violation codes', () => {
    const [ok, , violations] = validate.sync('ab', hasLength({ min: 3 }))

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'length.unsupported-type':
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
    const [ok, , violations] = validate.sync('abcdef', hasLength({ min: 3, max: 5 }))

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'length.unsupported-type':
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
    const [ok, , violations] = validate.sync(new Set([1]), hasSize({ exact: 2 }))

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'size.unsupported-type':
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
    const [ok, , violations] = validate.sync(11, hasValue({ range: [1, 10] as const }))

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'number.unsupported-type':
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
    const [ok, , violations] = validate.sync(12, multipleOf(5))

    if (!ok) {
      collection(violations).map(violation => {
        switch (violation.violates.code) {
          case 'number.unsupported-type':
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
})
