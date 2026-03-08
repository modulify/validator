import type {
  Assertion,
  AssertionConstraint,
  Predicate,
} from '~types'

import { attachConstraintDescriptor } from '@/metadata'

type AssertMeta = {
  name: string;
  bail: boolean;
  code?: string;
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
          kind: 'assertion',
          name: meta.name,
          code: meta.code ?? meta.name,
          args: meta.args ?? [],
        },
      }
    }

    for (const [extract, check, code, ...args] of constraints) {
      if (!check(extract(value), ...args)) {
        return {
          value,
          violates: {
            kind: 'assertion',
            name: meta.name,
            code,
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

  return attachConstraintDescriptor(assertion, () => ({
    kind: 'assertion',
    name: meta.name,
    bail: meta.bail,
    code: meta.code ?? meta.name,
    args: meta.args ?? [],
    constraints: constraints.map(([, , code, ...args]) => ({
      code,
      args,
    })),
  }))
}
