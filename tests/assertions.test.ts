import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  hasLength,
  hasPattern,
  hasSize,
  hasValue,
  isBigInt,
  isBlob,
  isFile,
  isFunction,
  isMap,
  isNaN,
  isSet,
  multipleOf,
  oneOf,
  endsWith,
  startsWith,
} from '@/assertions'

const assertionSubject = (name: string, code: string, args: unknown[] = []) => ({ kind: 'assertion', name, code, args })

describe('hasLength', () => {
  test.each([
    { options: { exact: 3 }, value: [1, 2, 3] },
    { options: { max: 5 }, value: [] },
    { options: { max: 5 }, value: [1, 2, 3, 4] },
    { options: { max: 5 }, value: [1, 2, 3, 4, 5] },
    { options: { min: 4 }, value: [1, 2, 3, 4] },
    { options: { min: 4 }, value: [1, 2, 3, 4, 5] },
    { options: { max: 5, min: 3 }, value: [1, 2, 3] },
    { options: { max: 5, min: 3 }, value: [1, 2, 3, 4, 5] },
    { options: { exact: 3 }, value: '123' },
    { options: { exact: 5 }, value: '12345' },
    { options: { max: 5 }, value: '' },
    { options: { max: 5 }, value: '1234' },
    { options: { max: 5 }, value: '12345' },
    { options: { min: 3 }, value: '123' },
    { options: { min: 3 }, value: '1234' },
    { options: { max: 5, min: 3 }, value: '123' },
    { options: { max: 5, min: 3 }, value: '1234' },
    { options: { max: 5, min: 3 }, value: '12345' },
  ])('valid #%#', ({ options, value }) => {
    expect(hasLength(options).check(value)).toBe(true)
    expect(hasLength(options)(value)).toBe(null)
  })

  test('treats missing options as no-op checks for supported values', () => {
    expect(hasLength().check('abc')).toBe(true)
    expect(hasLength().check([1, 2, 3])).toBe(true)
    expect(hasLength()('abc')).toBe(null)
    expect(hasLength()([1, 2, 3])).toBe(null)
  })

  test.each([
    { options: { exact: 3 }, value: '12', code: 'length.exact', args: [3] },
    { options: { exact: 3 }, value: '1234', code: 'length.exact', args: [3] },
    { options: { max: 5 }, value: '123456', code: 'length.max', args: [5] },
    { options: { min: 3 }, value: '12', code: 'length.min', args: [3] },
    { options: { max: 5, min: 3 }, value: '123456', code: 'length.max', args: [5] },
  ])('invalid strings #%#', ({ options, value, code, args }) => {
    expect(hasLength(options)(value)).toEqual({
      value,
      violates: assertionSubject('hasLength', code, args),
    })
  })

  test.each([
    { options: { exact: 3 }, value: [1, 2], code: 'length.exact', args: [3] },
    { options: { max: 5 }, value: [1, 2, 3, 4, 5, 6], code: 'length.max', args: [5] },
    { options: { min: 3 }, value: [], code: 'length.min', args: [3] },
    { options: { range: [3, 5] as [number, number] }, value: [1, 2], code: 'length.range', args: [[3, 5]] },
    { options: { range: [3, 5] as [number, number] }, value: [1, 2, 3, 4, 5, 6], code: 'length.range', args: [[3, 5]] },
  ])('invalid arrays #%#', ({ options, value, code, args }) => {
    expect(hasLength(options)(value)).toEqual({
      value,
      violates: assertionSubject('hasLength', code, args),
    })
  })

  test.each([
    { options: { exact: 3 }, value: {} },
    { options: { exact: 3 }, value: null },
    { options: { max: 5 }, value: undefined },
    { options: { min: 3 }, value: new Date() },
    { options: { max: 5, min: 3 }, value: new Blob() },
  ])('unsupported #%#', ({ options, value }) => {
    expect(hasLength(options)(value)).toEqual({
      value,
      violates: assertionSubject('hasLength', 'length.unsupported-type'),
    })
  })
})

describe('oneOf', () => {
  test('array', () => {
    const isCorrect = oneOf([1, 2, 3]).check

    expect(isCorrect(1)).toBe(true)
    expect(isCorrect(2)).toBe(true)
    expect(isCorrect(3)).toBe(true)
    expect(isCorrect(4)).toBe(false)
  })

  test('enum', () => {
    enum Appearance {
      Filled = 'filled',
      Outline = 'outline',
      Tonal = 'tonal'
    }

    const isCorrect = oneOf(Appearance).check

    expect(isCorrect('filled')).toBe(true)
    expect(isCorrect('outline')).toBe(true)
    expect(isCorrect('tonal')).toBe(true)
    expect(isCorrect(Appearance.Filled)).toBe(true)
    expect(isCorrect(Appearance.Outline)).toBe(true)
    expect(isCorrect(Appearance.Tonal)).toBe(true)
    expect(isCorrect('')).toBe(false)
  })

  test('equalTo option', () => {
    const isCorrect = oneOf([
      { value: 1 },
      { value: 2 },
      { value: 3 },
    ], { equalTo: (a, b) => typeof b === 'object' && 'value' in b && a.value === b.value }).check

    expect(isCorrect({ value: 1 })).toBe(true)
    expect(isCorrect({ value: 2 })).toBe(true)
    expect(isCorrect({ value: 3 })).toBe(true)
    expect(isCorrect({ value: 3, label: 'Third' })).toBe(true)
    expect(isCorrect({ value: 4 })).toBe(false)
    expect(isCorrect(1)).toBe(false)
    expect(isCorrect(2)).toBe(false)
    expect(isCorrect(3)).toBe(false)
  })

  test.each([
    { accept: ['1', 2, 3], value: 4 },
    { accept: [1, 2, 3], value: 4 },
    { accept: [1, 2, 3, '4'], value: 4 },
  ])('invalid#%#', ({ accept, value }) => {
    expect(oneOf(accept).check(value)).toBe(false)
  })
})

describe('string assertions', () => {
  test('hasPattern', () => {
    expect(hasPattern(/^[a-z]+$/).check('nick')).toBe(true)
    expect(hasPattern(/^[a-z]+$/)('nick')).toBe(null)
    expect(hasPattern(/^[a-z]+$/)('Nick')).toEqual({
      value: 'Nick',
      violates: assertionSubject('hasPattern', 'string.pattern', [/^[a-z]+$/]),
    })
    expect(hasPattern(/^[a-z]+$/)(1)).toEqual({
      value: 1,
      violates: assertionSubject('hasPattern', 'string.unsupported-type'),
    })
  })

  test('startsWith', () => {
    expect(startsWith('pre').check('prefix')).toBe(true)
    expect(startsWith('pre')('prefix')).toBe(null)
    expect(startsWith('pre')('suffix')).toEqual({
      value: 'suffix',
      violates: assertionSubject('startsWith', 'string.starts-with', ['pre']),
    })
    expect(startsWith('pre')(false)).toEqual({
      value: false,
      violates: assertionSubject('startsWith', 'string.unsupported-type'),
    })
  })

  test('endsWith', () => {
    expect(endsWith('.ts').check('index.ts')).toBe(true)
    expect(endsWith('.ts')('index.ts')).toBe(null)
    expect(endsWith('.ts')('index.js')).toEqual({
      value: 'index.js',
      violates: assertionSubject('endsWith', 'string.ends-with', ['.ts']),
    })
    expect(endsWith('.ts')(null)).toEqual({
      value: null,
      violates: assertionSubject('endsWith', 'string.unsupported-type'),
    })
  })
})

describe('numeric and size assertions', () => {
  test('hasSize', () => {
    const validSet = new Set([1, 2, 3])
    const validMap = new Map([['key', 1]])
    const invalidSet = new Set([1, 2])
    const rangeSet = new Set([1, 2, 3, 4])

    expect(hasSize({ min: 2 }).check(validSet)).toBe(true)
    expect(hasSize({ exact: 1 })(validMap)).toBe(null)
    expect(hasSize({ range: [3, 5] }).check(rangeSet)).toBe(true)
    expect(hasSize({ max: 1 })(invalidSet)).toEqual({
      value: invalidSet,
      violates: assertionSubject('hasSize', 'size.max', [1]),
    })
    expect(hasSize({ min: 1 })([])).toEqual({
      value: [],
      violates: assertionSubject('hasSize', 'size.unsupported-type'),
    })
  })

  test('hasValue', () => {
    expect(hasValue({ range: [1, 3] }).check(2)).toBe(true)
    expect(hasValue({ exact: 3 })(3)).toBe(null)
    expect(hasValue({ max: 3 }).check(2)).toBe(true)
    expect(hasValue({ min: 3 })(2)).toEqual({
      value: 2,
      violates: assertionSubject('hasValue', 'number.min', [3]),
    })
    expect(hasValue({ max: 3 })(4)).toEqual({
      value: 4,
      violates: assertionSubject('hasValue', 'number.max', [3]),
    })
    expect(hasValue({ max: 3 })('2')).toEqual({
      value: '2',
      violates: assertionSubject('hasValue', 'number.unsupported-type'),
    })
  })

  test('multipleOf', () => {
    expect(multipleOf(5).check(10)).toBe(true)
    expect(multipleOf(0.1).check(0.3)).toBe(true)
    expect(multipleOf(0).check(10)).toBe(false)
    expect(multipleOf(5)(10)).toBe(null)
    expect(multipleOf(5)(12)).toEqual({
      value: 12,
      violates: assertionSubject('multipleOf', 'number.multiple-of', [5]),
    })
    expect(multipleOf(0)(10)).toEqual({
      value: 10,
      violates: assertionSubject('multipleOf', 'number.multiple-of', [0]),
    })
    expect(multipleOf(5)('10')).toEqual({
      value: '10',
      violates: assertionSubject('multipleOf', 'number.unsupported-type'),
    })
  })
})

describe('primitive assertions', () => {
  test('isBigInt', () => {
    const value = BigInt(1)

    expect(isBigInt.check(value)).toBe(true)
    expect(isBigInt(value)).toBe(null)
    expect(isBigInt(1)).toEqual({
      value: 1,
      violates: assertionSubject('isBigInt', 'type.bigint'),
    })
  })

  test('isBlob', () => {
    const value = new Blob(['payload'])

    expect(isBlob.check(value)).toBe(true)
    expect(isBlob(value)).toBe(null)
    expect(isBlob('payload')).toEqual({
      value: 'payload',
      violates: assertionSubject('isBlob', 'type.blob'),
    })
  })

  test('isFile', () => {
    const value = new File(['payload'], 'test.txt')
    const invalid = new Blob(['payload'])

    expect(isFile.check(value)).toBe(true)
    expect(isFile(value)).toBe(null)
    expect(isFile(invalid)).toEqual({
      value: invalid,
      violates: assertionSubject('isFile', 'type.file'),
    })
  })

  test('isFunction', () => {
    const value = () => null

    expect(isFunction.check(value)).toBe(true)
    expect(isFunction(value)).toBe(null)
    expect(isFunction({})).toEqual({
      value: {},
      violates: assertionSubject('isFunction', 'type.function'),
    })
  })

  test('isMap', () => {
    const value = new Map([['key', 1]])

    expect(isMap.check(value)).toBe(true)
    expect(isMap(value)).toBe(null)
    expect(isMap({ key: 1 })).toEqual({
      value: { key: 1 },
      violates: assertionSubject('isMap', 'type.map'),
    })
  })

  test('isNaN', () => {
    expect(isNaN.check(Number.NaN)).toBe(true)
    expect(isNaN(Number.NaN)).toBe(null)
    expect(isNaN(1)).toEqual({
      value: 1,
      violates: assertionSubject('isNaN', 'number.nan'),
    })
  })

  test('isSet', () => {
    const value = new Set([1, 2, 3])

    expect(isSet.check(value)).toBe(true)
    expect(isSet(value)).toBe(null)
    expect(isSet([1, 2, 3])).toEqual({
      value: [1, 2, 3],
      violates: assertionSubject('isSet', 'type.set'),
    })
  })
})
