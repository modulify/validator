import type {
  Assertion,
  AssertionConstraintSubject,
  AssertionConstraint,
  Predicate,
} from '~types'

import { attachConstraintDescriptor } from '@/metadata'

type AssertMeta = {
  name: string;
  bail: boolean;
  code?: string;
  args?: readonly unknown[];
}

type ResolveAssertionCode<Name extends string, Code extends string | undefined> = Code extends string ? Code : Name

type ResolveAssertionArgs<Args extends readonly unknown[] | undefined> = Args extends readonly unknown[] ? Args : []

export const assert = <
  T,
  const Name extends string,
  const Bail extends boolean,
  const Code extends string | undefined = undefined,
  const Args extends readonly unknown[] | undefined = undefined,
  const C extends readonly AssertionConstraint[] = [],
>(
  predicate: Predicate<T>,
  meta: AssertMeta & {
    name: Name;
    bail: Bail;
    code?: Code;
    args?: Args;
  },
  constraints: C = [] as unknown as C
): Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name> => {
  const assertionCode = (meta.code ?? meta.name) as ResolveAssertionCode<Name, Code>
  const assertionArgs = (meta.args ?? []) as ResolveAssertionArgs<Args>
  const violationSubject = {
    kind: 'assertion',
    name: meta.name,
    code: assertionCode,
    args: assertionArgs,
  } as {
    kind: 'assertion';
    name: Name;
    code: ResolveAssertionCode<Name, Code>;
    args: ResolveAssertionArgs<Args>;
  }
  const assertion = ((value: unknown): ReturnType<
    Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name>
  > => {
    if (!predicate(value)) {
      return {
        value,
        violates: violationSubject,
      }
    }

    for (const [extract, check, code, ...args] of constraints) {
      if (!check(extract(value), ...args)) {
        const constraintSubject = {
          kind: 'assertion',
          name: meta.name,
          code,
          args,
        } as unknown as AssertionConstraintSubject<C[number], Name>

        return {
          value,
          violates: constraintSubject,
        }
      }
    }

    return null
  }) as Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name>

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
    code: assertionCode,
    args: assertionArgs,
    constraints: constraints.map(([, , code, ...args]) => ({
      code,
      args,
    })),
  }))
}
