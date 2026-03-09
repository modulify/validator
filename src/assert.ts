import type {
  Assertion,
  AssertionStage,
  Constraint,
  AssertionConstraintSubject,
  AssertionConstraint,
  Guard,
  Predicate,
  Refinement,
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
type ConstraintInput<C extends readonly AssertionConstraint[]> = C[number] extends AssertionConstraint<infer Input, unknown, readonly unknown[], string>
  ? Input
  : never

type RuntimeAssertion = Assertion & {
  [assertionStageSymbol]?: AssertionStage;
  [runRefinementSymbol]?: (value: unknown) => ReturnType<Assertion>;
  [checkRefinementSymbol]?: (value: unknown) => boolean;
}

const assertionStageSymbol = Symbol('modulify.validator.assertion.stage')
const runRefinementSymbol = Symbol('modulify.validator.assertion.runRefinement')
const checkRefinementSymbol = Symbol('modulify.validator.assertion.checkRefinement')

const createAssertion = <
  T,
  const Stage extends AssertionStage,
  const Name extends string,
  const Bail extends boolean,
  const Code extends string | undefined = undefined,
  const Args extends readonly unknown[] | undefined = undefined,
  const C extends readonly AssertionConstraint<T, unknown, readonly unknown[], string>[] = [],
>(
  stage: Stage,
  predicate: Predicate<T>,
  meta: AssertMeta & {
    name: Name;
    bail: Bail;
    code?: Code;
    args?: Args;
  },
  constraints: C = [] as unknown as C
): Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name, Stage> => {
  void stage
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
  const runConstraints = (value: T) => {
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
  }
  const checkConstraints = (value: T) => (
    !constraints.length || constraints.every(([extract, check, , ...args]) => check(extract(value), ...args))
  )
  const assertion = ((value: unknown): ReturnType<
    Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name, Stage>
  > => {
    if (!predicate(value)) {
      return {
        value,
        violates: violationSubject,
      } as ReturnType<Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name, Stage>>
    }

    return runConstraints(value) as ReturnType<
      Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name, Stage>
    >
  }) as Assertion<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name, Stage>

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
      value: (value: unknown): value is T => predicate(value) && checkConstraints(value),
    },
    [assertionStageSymbol]: {
      enumerable: false,
      value: stage,
    },
    [runRefinementSymbol]: {
      enumerable: false,
      value: (value: unknown) => runConstraints(value as T),
    },
    [checkRefinementSymbol]: {
      enumerable: false,
      value: (value: unknown) => checkConstraints(value as T),
    },
  })

  return /* @__PURE__ */ attachConstraintDescriptor(assertion, () => ({
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

export const assert = <
  T,
  const Name extends string,
  const Bail extends boolean,
  const Code extends string | undefined = undefined,
  const Args extends readonly unknown[] | undefined = undefined,
  const C extends readonly AssertionConstraint<T, unknown, readonly unknown[], string>[] = [],
>(
  predicate: Predicate<T>,
  meta: AssertMeta & {
    name: Name;
    bail: Bail;
    code?: Code;
    args?: Args;
  },
  constraints: C = [] as unknown as C
): Guard<T, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name> => {
  return createAssertion('guard', predicate, meta, constraints) as Guard<
    T,
    C,
    ResolveAssertionCode<Name, Code>,
    ResolveAssertionArgs<Args>,
    Name
  >
}

export const isRefinementAssertion = (constraint: Constraint): constraint is Assertion => {
  return typeof constraint === 'function' && (constraint as RuntimeAssertion)[assertionStageSymbol] === 'refinement'
}

export const runRefinementAssertion = (constraint: Assertion, value: unknown): ReturnType<Assertion> => {
  const runRefinement = (constraint as RuntimeAssertion)[runRefinementSymbol]

  return runRefinement ? runRefinement(value) : constraint(value)
}

export const checkRefinementAssertion = (constraint: Assertion, value: unknown): boolean => {
  const checkRefinement = (constraint as RuntimeAssertion)[checkRefinementSymbol]

  return checkRefinement ? checkRefinement(value) : constraint.check(value)
}

export const refine = <
  const Name extends string,
  const Bail extends boolean,
  const Code extends string | undefined = undefined,
  const Args extends readonly unknown[] | undefined = undefined,
  const C extends readonly AssertionConstraint[] = [],
>(
  meta: AssertMeta & {
    name: Name;
    bail: Bail;
    code?: Code;
    args?: Args;
  },
  constraints: C = [] as unknown as C
): Refinement<ConstraintInput<C>, C, ResolveAssertionCode<Name, Code>, ResolveAssertionArgs<Args>, Name> => {
  return createAssertion('refinement', ((value: unknown): value is ConstraintInput<C> => true), meta, constraints) as Refinement<
    ConstraintInput<C>,
    C,
    ResolveAssertionCode<Name, Code>,
    ResolveAssertionArgs<Args>,
    Name
  >
}
