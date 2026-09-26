import {
  describe,
  expectTypeOf,
  test,
} from 'vitest'

import {
  assert,
  isString,
  refine,
  validate,
} from '@/index'

describe('custom assertion checker types', () => {
  test('connects extractor values and checker arguments', () => {
    const minLength = refine({ name: 'minLength', bail: false }, [[
      (value: string) => value.length,
      (length: number, min: number) => length >= min,
      'custom.min-length',
      3,
    ]])
    const result = validate.sync('abcd', [isString, minLength])

    if (result[0]) expectTypeOf(result[1]).toEqualTypeOf<string>()

    assert(isString.check, { name: 'wrongValue', bail: true }, [
      // @ts-expect-error checker cannot consume the extractor result
      [(value: string) => value.length, (value: string) => value.startsWith('x'), 'custom.wrong'],
    ])
    refine({ name: 'wrongArgs', bail: false }, [
      // @ts-expect-error checker arguments must accept the constraint args
      [(value: string) => value.length, (length: number, min: number) => length >= min, 'custom.wrong', 'three'],
    ])
    assert(isString.check, { name: 'wrongInput', bail: true }, [
      // @ts-expect-error extractor must accept the guarded input
      [(value: number) => value, (value: number) => value > 0, 'custom.wrong'],
    ])
  })

  test('requires a domain accepted by every extractor in a refinement', () => {
    const incompatible = refine({ name: 'incompatible', bail: false }, [
      [(value: string) => value.toUpperCase(), (value: string) => value.length > 0, 'custom.string'],
      [(value: number) => value.toFixed(), (value: string) => value.length > 0, 'custom.number'],
    ])

    // @ts-expect-error string is not accepted by the numeric extractor
    validate.sync('abc', [isString, incompatible])
  })

  test('supports generic custom refinement factories', () => {
    const minLength = <const Minimum extends number>(minimum: Minimum) => refine({ name: 'minLength', bail: false }, [[
      (value: string) => value.length,
      (length: number, min: number) => length >= min,
      'custom.min-length',
      minimum,
    ]])
    const result = validate.sync('abcd', [isString, minLength(3)])

    if (result[0]) expectTypeOf(result[1]).toEqualTypeOf<string>()
    expectTypeOf<(typeof result)[2][number]['violates']['code']>().toEqualTypeOf<'type.string' | 'custom.min-length'>()
  })
})
