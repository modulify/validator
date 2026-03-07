export type Intersect<T extends unknown[]> =
  T extends [infer First, ...infer Rest extends unknown[]]
    ? First & Intersect<Rest>
    : unknown;

export type Recursive<T> = T | Recursive<T>[]

export type MaybeMany<V> = V | V[]
export type MaybePromise<V> = V | Promise<V>

export type Predicate<T = unknown> = (value: unknown) => value is T

export type Checker<T, A extends unknown[] = unknown[]> = (value: T, ...args: A) => boolean
export type CheckerArguments<C> = C extends (value: unknown, ...args: infer A) => unknown ? A : never

export type Extractor<T, V> = (value: T) => V

export type ViolationSubject<T extends unknown[] = unknown[]> = {
  predicate: string;
  rule: string;
  args: T;
}

export type Violation<S extends ViolationSubject = ViolationSubject> = {
  value: unknown;
  path?: PropertyKey[];
  violates: S;
}

export type AssertionConstraint<
  T = unknown,
  V = unknown,
  A extends unknown[] = unknown[],
  N extends string = string
> = [
  Extractor<T, V>,
  Checker<V, A>,
  N,
  ...A
]

export type Assertion<
  T = unknown,
  C extends AssertionConstraint[] = AssertionConstraint[]
> = ((value: unknown) => MaybePromise<Omit<Violation, 'path'> | null>) & {
  readonly name: string;
  readonly bail: boolean;
  readonly constraints: C;
  readonly check: Predicate<T>;
}

export type Validate = <T> (
  value: T,
  constraints: MaybeMany<Assertion | Validator>,
  path?: PropertyKey[]
) => Promise<Violation[]>

export type ValidateSync = <T>(
  value: T,
  constraints: MaybeMany<Assertion | Validator>,
  path?: PropertyKey[]
) => Violation[]

export type Validation<F extends Validate | ValidateSync> = F extends Validate
  ? MaybePromise<Violation[]>
  : Violation[]

export interface Validator {
  run <F extends Validate | ValidateSync> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[];
}
