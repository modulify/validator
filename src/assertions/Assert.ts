import {
  Assertion,
  Meta,
  Predicate,
  Violation,
} from '~types'

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

      check (value: unknown, path: PropertyKey[] = []) {
        return check(this, value, path)
      },
    } as Assertion<T, M>
  }

  return Object.assign(delegate(predicate), options, extender()) as Assertion<T, M>
}

function check <
  T = unknown,
  M = unknown
>(assert: Assertion<T, M>, value: unknown, path: PropertyKey[] = []): null | Violation<M> {
  if (assert(value)) {
    for (const a of assert.also) {
      const violation = check(a, value, path)
      if (violation) {
        return {
          ...violation,
          violates: assert.fqn,
        } as Violation<M>
      }
    }

    return null
  }

  return {
    value,
    path,
    violates: assert.fqn,
    ...('reason' in assert ? { reason: assert.reason } : {}),
    ...('meta' in assert ? { meta: assert.meta } : {}),
  } as Violation<M>
}

function delegate <T>(p: Predicate<T>): Predicate<T> {
  return (value: unknown): value is T => p(value)
}
