import type { Recursive } from '../types'

export type A<T> = T extends unknown[] ? T : T[]

export const arraify = <T> (value: T): A<T> => Array.isArray(value)
  ? [...value] as A<T>
  : [value] as A<T>

export const flatten = <T>(recursive: Recursive<T>[]): T[] => {
  const flattened: T[] = []
  recursive.forEach(element => {
    flattened.push(...(
      Array.isArray(element)
        ? flatten(element)
        : [element]
    ))
  })

  return flattened
}