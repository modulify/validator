import {
  describe,
  expectTypeOf,
  test,
} from 'vitest'

import {
  isNumber,
  isShape,
  isString,
} from '@/predicates'

describe('isShape types', () => {
  test('narrows shorthand and tuple fields while preserving optional keys', () => {
    const predicate = isShape({
      id: isNumber,
      title: [isString, true],
      nickname: [isString, false],
    })
    const value: unknown = {}

    if (predicate(value)) {
      expectTypeOf(value.id).toEqualTypeOf<number>()
      expectTypeOf(value.title).toEqualTypeOf<string>()
      expectTypeOf(value.nickname).toEqualTypeOf<string | undefined>()
      expectTypeOf({ id: 1, title: 'Profile' }).toMatchTypeOf<typeof value>()
      expectTypeOf<{ id: number; title: string; nickname?: string }>().toMatchTypeOf<typeof value>()
      expectTypeOf(value).toMatchTypeOf<{ id: number; title: string; nickname?: string }>()
      expectTypeOf({}).not.toMatchTypeOf<typeof value>()
    }
  })

  test('keeps fields optional when required is decided at runtime', () => {
    const required = false as boolean
    const predicate = isShape({ name: [isString, required] })
    const value: unknown = {}

    if (predicate(value)) {
      expectTypeOf({}).toMatchTypeOf<typeof value>()
      expectTypeOf(value.name).toEqualTypeOf<string | undefined>()
    }
  })
})
