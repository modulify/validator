export type Intersect<T extends unknown[]> =
  T extends [infer First, ...infer Rest extends unknown[]]
    ? First & Intersect<Rest>
    : unknown;

export type Recursive<T> = T | Recursive<T>[]

export type MaybeMany<V> = V | V[]
export type MaybePromise<V> = V | Promise<V>

export type Predicate<T = unknown> = (value: unknown) => value is T
export type Meta<T> = {
  fqn: string | symbol,
  bail: boolean;
  reason?: string | symbol;
  meta?: T;
}

export type Assertion<T = unknown, M = unknown> = Predicate<T> & Meta<M> & {
  readonly also: Assertion[]
  That(...asserts: Assertion[]): Assertion<T, M>;
}

export type Violation<M = unknown> = {
  value: unknown;
  /** Path to a property, if a constraint is used as part of a `Collection` for checking some object's structure */
  path?: PropertyKey[];
  violates: string | symbol;
  reason?: string | symbol;
  meta?: M;
}

export type Validator<M = unknown> = ((
  value: unknown,
  path?: PropertyKey[]
) => MaybePromise<Violation<M> | null>) & {
  fqn: string;
  bail: boolean;
}

export type Constraint = Assertion | Validator | ValidationRunner

export type Validate = <T> (
  value: T,
  constraints: MaybeMany<Constraint>,
  path?: PropertyKey[]
) => Promise<Violation[]>

export type ValidateSync = <T>(
  value: T,
  constraints: MaybeMany<Constraint>,
  path?: PropertyKey[]
) => Violation[]

export type Validation<F extends Validate | ValidateSync> = Validate extends F
  ? MaybePromise<Violation[]>
  : Violation[]

export interface ValidationRunner {
  run <F extends Validate | ValidateSync> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[];
}
