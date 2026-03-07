import type {
  Assertion,
  AssertionConstraint,
  Predicate,
} from '~types'

type AssertMeta = {
  name: string;
  bail: boolean;
  rule?: string;
  args?: unknown[];
}

export const assert = <T, C extends AssertionConstraint[] = AssertionConstraint[]>(
  predicate: Predicate<T>,
  meta: AssertMeta,
  constraints: C = [] as C
): Assertion<T, C> => {
  const assertion = ((value: unknown): ReturnType<Assertion<T, C>> => {
    if (!predicate(value)) {
      return {
        value,
        violates: {
          predicate: meta.name,
          rule: meta.rule ?? meta.name,
          args: meta.args ?? [],
        },
      }
    }

    for (const [extract, check, rule, ...args] of constraints) {
      if (!check(extract(value), ...args)) {
        return {
          value,
          violates: {
            predicate: meta.name,
            rule,
            args,
          },
        }
      }
    }

    return null
  }) as Assertion<T, C>

  Object.defineProperties(assertion, {
    name: {
      configurable: true,
      value: meta.name,
    },
    bail: {
      enumerable: true,
      value: meta.bail,
    },
    constraints: {
      enumerable: true,
      value: constraints,
    },
    check: {
      enumerable: true,
      value: (value: unknown): value is T => predicate(value) && (
        !constraints.length || constraints.every(([extract, check, , ...args]) => check(extract(value), ...args))
      ),
    },
  })

  return assertion
}
