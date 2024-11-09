import { describe, expect, test } from 'vitest'

import {
  hasProperty,
  isArray,
  isBoolean,
  isDate,
  isEmail,
  isExact,
  isNull,
  isNumber,
  isObject,
  isRecord,
  isString,
  isSymbol,
  isUndefined,
  And,
  Or,
  Not,
} from '@/predicates'

describe('hasProperty', () => {
  const property = Symbol('property')

  test('returns true when property exists', () => {
    expect(hasProperty('a')({ a: 1 })).toBe(true)
    expect(hasProperty(0)({ 0: 1 })).toBe(true)
    expect(hasProperty(property)({ [property]: 1 })).toBe(true)
    expect(hasProperty('length')([])).toBe(true)
  })

  test('returns false when property does not exist', () => {
    expect(hasProperty('a')({})).toBe(false)
    expect(hasProperty(0)({})).toBe(false)
    expect(hasProperty(property)({})).toBe(false)
    expect(hasProperty(property)(null)).toBe(false)
    expect(hasProperty('does_not_exists')([])).toBe(false)
  })
})

describe('isArray', () => {
  test('returns true when a value is an array', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2, 3])).toBe(true)
    expect(isArray(['a', 'b', 'c'])).toBe(true)
    expect(isArray([null, undefined, 3])).toBe(true)
  })

  test('returns false when a value is not an array', () => {
    expect(isArray({})).toBe(false)
    expect(isArray(1)).toBe(false)
    expect(isArray('string')).toBe(false)
    expect(isArray(null)).toBe(false)
    expect(isArray(undefined)).toBe(false)
    expect(isArray(Symbol('array'))).toBe(false)
  })
})

describe('isBoolean', () => {
  test('returns true when a value\'s type is a boolean', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
  })

  test('returns false when a value\'s type is not a boolean', () => {
    expect(isBoolean({})).toBe(false)
    expect(isBoolean(1)).toBe(false)
    expect(isBoolean('true')).toBe(false)
    expect(isBoolean(null)).toBe(false)
    expect(isBoolean(undefined)).toBe(false)
    expect(isBoolean(Symbol('boolean'))).toBe(false)
  })
})

describe('isDate', () => {
  test('returns true when a value is a valid Date object', () => {
    expect(isDate(new Date())).toBe(true)
    expect(isDate(new Date('2023-01-01'))).toBe(true)
  })

  test('returns false when a value is not a valid Date object', () => {
    expect(isDate({})).toBe(false)
    expect(isDate(12345)).toBe(false)
    expect(isDate('2023-01-01')).toBe(false)
    expect(isDate(null)).toBe(false)
    expect(isDate(undefined)).toBe(false)
    expect(isDate(Symbol('date'))).toBe(false)
  })
})

describe('isEmail', () => {
  test('returns true when a value is email', () => {
    expect(isEmail('my@test.test')).toBe(true)
    expect(isEmail('user@example.com')).toBe(true)
    expect(isEmail('test123@domain.co')).toBe(true)
    expect(isEmail('name.surname@sub.domain.org')).toBe(true)
    expect(isEmail('email+alias@domain.com')).toBe(true)
  })

  test('returns false when a value is not email', () => {
    expect(isEmail({})).toBe(false)
    expect(isEmail(2)).toBe(false)
    expect(isEmail(Symbol('2'))).toBe(false)
    expect(isEmail('not-email')).toBe(false)
  })
})

describe('isExact', () => {
  test('returns true when a value is equal exactly to the specified one', () => {
    expect(isExact(1)(1)).toBe(true)
    expect(isExact('string')('string')).toBe(true)
    expect(isExact(true)(true)).toBe(true)
    expect(isExact(null)(null)).toBe(true)
    expect(isExact(undefined)(undefined)).toBe(true)

    const s1 = Symbol('s1')

    expect(isExact(s1)(s1)).toBe(true)
    expect(isExact(Symbol.for('s2'))(Symbol.for('s2'))).toBe(true)
  })

  test('returns false when a value is not equal exactly to the specified one', () => {
    expect(isExact(1)(2)).toBe(false)
    expect(isExact('string')('different')).toBe(false)
    expect(isExact(true)(false)).toBe(false)
    expect(isExact(null)(undefined)).toBe(false)
    expect(isExact(undefined)(null)).toBe(false)
    expect(isExact(Symbol('s1'))(Symbol('s1'))).toBe(false)
  })
})

describe('isNull', () => {
  test('returns true when a value is equal to null', () => {
    expect(isNull(null)).toBe(true)
  })

  test('returns false when a value is not equal to null', () => {
    expect(isNull({})).toBe(false)
    expect(isNull(2)).toBe(false)
    expect(isNull(Symbol('2'))).toBe(false)
  })
})

describe('isNumber', () => {
  test('returns true when a value\'s type is a number', () => {
    expect(isNumber(1)).toBe(true)
    expect(isNumber(1.5)).toBe(true)
  })

  test('returns false when a value\'s type is not a number', () => {
    expect(isNumber({})).toBe(false)
    expect(isNumber('1')).toBe(false)
    expect(isNumber('1.5')).toBe(false)
  })
})

describe('isObject', () => {
  test('returns true when a value is an object', () => {
    expect(isObject(null)).toBe(true)
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
    expect(isObject(Object.create(null))).toBe(true)
    expect(isObject([])).toBe(true)

    class A {}

    expect(isObject(new A())).toBe(true)
  })

  test('returns false when a value is not an object', () => {
    expect(isObject(undefined)).toBe(false)
    expect(isObject(1)).toBe(false)
    expect(isObject('string')).toBe(false)
    expect(isObject(true)).toBe(false)
    expect(isObject(Symbol('key'))).toBe(false)
  })
})

describe('isRecord', () => {
  const a = Symbol('property')
  const b = Symbol('property')

  test('returns true when a value is a Record<*, *>', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ 'a': 1, 'b': 2 })).toBe(true)
    expect(isRecord({ [a]: 1, [b]: 2 })).toBe(true)
  })

  test('returns false when a value is not a Record<*, *>', () => {
    expect(isRecord(1)).toBe(false)
    expect(isRecord('1')).toBe(false)
    expect(isRecord(null)).toBe(false)

    class A {}

    expect(isRecord(new A())).toBe(false)
  })
})

describe('isString', () => {
  test('returns true when a value\'s type is a string', () => {
    expect(isString('1')).toBe(true)
    expect(isString('1.5')).toBe(true)
    expect(isString('Some text')).toBe(true)
  })

  test('returns false when a value\'s type is not a string', () => {
    expect(isString({})).toBe(false)
    expect(isString(1)).toBe(false)
    expect(isString(1.5)).toBe(false)
    expect(isString(true)).toBe(false)
    expect(isString(false)).toBe(false)
  })
})

describe('isSymbol', () => {
  test('returns true when a value is a symbol', () => {
    expect(isSymbol(Symbol('key'))).toBe(true)
    expect(isSymbol(Symbol.for('key'))).toBe(true)
  })

  test('returns false when a value is not a symbol', () => {
    expect(isSymbol({})).toBe(false)
    expect(isSymbol(123)).toBe(false)
    expect(isSymbol('string')).toBe(false)
    expect(isSymbol(true)).toBe(false)
    expect(isSymbol(null)).toBe(false)
    expect(isSymbol(undefined)).toBe(false)
  })
})

describe('isUndefined', () => {
  test('returns true when a value is equal to undefined', () => {
    expect(isUndefined(undefined)).toBe(true)
  })

  test('returns false when a value is not equal to undefined', () => {
    expect(isUndefined({})).toBe(false)
    expect(isUndefined(2)).toBe(false)
    expect(isUndefined(Symbol('2'))).toBe(false)
  })
})

describe('And', () => {
  test('returns true when a value satisfies all of the predicates', () => {
    expect(And(isNumber, (value: number): value is number => isFinite(value))(1)).toBe(true)
    expect(And(
      isString,
      (value: string): value is string => value.length > 3,
      (value: string): value is string => value.length < 10
    )('NickName')).toBe(true)
  })

  test('returns false when a value does not satisfy at least one of the predicates', () => {
    expect(And(isNumber, (value: number): value is number => value > 10)(5)).toBe(false)
    expect(And(isString, (value: string): value is string => value.length > 0)('')).toBe(false)
  })
})

describe('Or', () => {
  test('returns true when a value satisfies to any of the predicates', () => {
    expect(Or(isArray, isNumber)(1)).toBe(true)
    expect(Or(isArray, isNumber)([])).toBe(true)
    expect(Or(isArray, isNumber)([1, 2])).toBe(true)
    expect(Or(isArray, isString)([])).toBe(true)
    expect(Or(isArray, isString)([1, 2])).toBe(true)
    expect(Or(isArray, isString)('')).toBe(true)
    expect(Or(isArray, isString)('String')).toBe(true)

    expect(Or(isNumber, isString)(1)).toBe(true)

    expect(Or(isArray, isNumber, isString)(1)).toBe(true)
    expect(Or(isArray, isNumber, isString)('1')).toBe(true)
    expect(Or(isArray, isNumber, isString)('String')).toBe(true)
  })

  test('returns false when a value does not satisfy to all the predicates', () => {
    expect(Or(isArray, isNumber)({})).toBe(false)
    expect(Or(isArray, isNumber)(null)).toBe(false)
    expect(Or(isArray, isNumber)('String')).toBe(false)
    expect(Or(isArray, isString)({})).toBe(false)
    expect(Or(isArray, isString)(null)).toBe(false)
    expect(Or(isArray, isString)(1)).toBe(false)
    expect(Or(isArray, isString)(Symbol('Symbol'))).toBe(false)

    expect(Or(isNumber, isString)([])).toBe(false)
    expect(Or(isNumber, isString)(null)).toBe(false)
    expect(Or(isNumber, isString)({})).toBe(false)

    expect(Or(isArray, isNumber, isString)({})).toBe(false)
    expect(Or(isArray, isNumber, isString)(null)).toBe(false)
    expect(Or(isArray, isNumber, isString)(Symbol('Symbol'))).toBe(false)
  })
})

describe('Not', () => {
  test('returns true when a value does not satisfy the predicate', () => {
    expect(Not(isArray)({})).toBe(true)
    expect(Not(isArray)(2)).toBe(true)
    expect(Not(isArray)('2')).toBe(true)
    expect(Not(isNull)(undefined)).toBe(true)
    expect(Not(isNull)(2)).toBe(true)
    expect(Not(isNumber)('string')).toBe(true)
    expect(Not(isNumber)(null)).toBe(true)
    expect(Not(isObject)('abc')).toBe(true)
    expect(Not(isString)(123)).toBe(true)
    expect(Not(isSymbol)(123)).toBe(true)
    expect(Not(isUndefined)(null)).toBe(true)
  })

  test('returns false when a value satisfies the predicate', () => {
    expect(Not(isArray)([])).toBe(false)
    expect(Not(isNull)(null)).toBe(false)
    expect(Not(isNumber)(123)).toBe(false)
    expect(Not(isObject)({})).toBe(false)
    expect(Not(isString)('string')).toBe(false)
    expect(Not(isSymbol)(Symbol('key'))).toBe(false)
    expect(Not(isUndefined)(undefined)).toBe(false)
  })
})
