import type {
  Assertion,
  Meta,
  Predicate,
} from '~types'

const delegate = <T>(p: Predicate<T>): Predicate<T> => {
  return (value: unknown): value is T => p(value)
}

export const Assert = <
  T = unknown,
  M = unknown
>(predicate: Predicate<T>, options: Meta<M>): Assertion<T, M> => {
  const extender = (asserts: Assertion[] = []): Pick<Assertion<T, M>, 'That' | 'also'> => {
    return {
      That (...asserts: Assertion[]) {
        return Object.assign(delegate(predicate), options, extender(asserts)) as Assertion<T, M>
      },

      get also (): Assertion[] {
        return asserts
      },
    } as Assertion<T, M>
  }

  return Object.assign(delegate(predicate), options, extender())
}
