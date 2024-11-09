import {
  Assertion,
  Violation,
} from '~types'

const check = <
  T = unknown,
  M = unknown
>(assert: Assertion<T, M>, value: unknown, path: PropertyKey[] = []): null | Violation<M> => {
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

export default check
