/** Internal utility that intersects all members of a tuple into a single type. */
export type Intersect<T extends readonly unknown[]> =
  T extends readonly [infer First, ...infer Rest extends readonly unknown[]]
    ? First & Intersect<Rest>
    : unknown;

/** Internal utility that converts a union like `A | B` into `A & B`. */
export type UnionToIntersection<T> =
  (T extends unknown ? (value: T) => void : never) extends (value: infer I) => void
    ? I
    : never;

/** Internal helper for nested validation results. */
export type Recursive<T> = T | Recursive<T>[]

/** Accepts either a single value or an array of values. */
export type MaybeMany<V> = V | readonly V[]
/** Accepts either a plain value or a promise of that value. */
export type MaybePromise<V> = V | Promise<V>

/** Runtime predicate that also acts as a TypeScript type guard. */
export type Predicate<T = unknown> = (value: unknown) => value is T

/** Checker used by assertion constraints after a value is extracted. */
export type Checker<T, A extends unknown[] = unknown[]> = (value: T, ...args: A) => boolean
/** Extracts checker arguments from a checker function type. */
export type CheckerArguments<C> = C extends (value: unknown, ...args: infer A) => unknown ? A : never

/** Extracts a derived value from the original input before a checker runs. */
export type Extractor<T, V> = (value: T) => V

/** Machine-readable description of a validation failure. */
export type ViolationSubject<T extends unknown[] = unknown[]> = {
  predicate: string;
  rule: string;
  args: T;
}

/**
 * Structured validation error returned by assertions and composed validators.
 *
 * `path` points to the nested property or array index that failed.
 *
 * Example:
 * `violation.violates.rule === 'min'`
 */
export type Violation<S extends ViolationSubject = ViolationSubject> = {
  value: unknown;
  path?: PropertyKey[];
  violates: S;
}

/**
 * Extra checker pipeline for an assertion.
 *
 * Example:
 * `type LengthConstraint = AssertionConstraint<string, number, [min: number], 'min'>`
 */
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

/**
 * Leaf-level validator that checks a single value and either succeeds with `null`
 * or returns a structured violation.
 *
 * `check` is the synchronous type guard used for inference and sync narrowing.
 */
export type Assertion<
  T = unknown,
  C extends AssertionConstraint[] = AssertionConstraint[]
> = ((value: unknown) => MaybePromise<Omit<Violation, 'path'> | null>) & {
  readonly name: string;
  readonly bail: boolean;
  readonly constraints: C;
  readonly check: Predicate<T>;
}

/**
 * Any reusable validation unit: either a leaf `Assertion` or a composed `Validator`.
 *
 * This is the main building block accepted by `validate(...)`, `matches.sync(...)`,
 * `HasProperties(...)`, and `Each(...)`.
 */
export type Constraint<T = unknown> = Assertion<T> | Validator<T>

/** Extracts the validated TypeScript type from a single constraint. */
export type InferConstraint<C> =
  C extends Assertion<infer T, AssertionConstraint[]>
    ? T
    : C extends Validator<infer T>
      ? T
      : never

/**
 * Extracts the validated TypeScript type from one or many constraints.
 *
 * When an array of constraints is provided, their inferred types are intersected.
 *
 * Example:
 * `InferConstraints<[typeof isDefined, typeof isString]> // string`
 *
 * Example:
 * `InferConstraints<typeof HasProperties({ name: [isDefined, isString] })> // { name: string }`
 */
export type InferConstraints<C> =
  C extends readonly []
    ? unknown
    : C extends readonly unknown[]
      ? UnionToIntersection<InferConstraint<C[number]>>
      : InferConstraint<C>

/** Internal async runner signature used by composed validators. */
export type Validate = (
  value: unknown,
  constraints: MaybeMany<Constraint>,
  path?: PropertyKey[]
) => Promise<Violation[]>

/** Internal sync runner signature used by composed validators. */
export type ValidateSync = (
  value: unknown,
  constraints: MaybeMany<Constraint>,
  path?: PropertyKey[]
) => Violation[]

/** Internal union of async and sync runner signatures. */
export type ValidateLike = Validate | ValidateSync

/** Internal helper that maps a runner kind to nested validation results. */
export type Validation<F extends ValidateLike> = F extends Validate
  ? MaybePromise<Violation[]>
  : Violation[]

/** Successful `validate(...)` tuple with typed `validated` value. */
export type ValidationSuccess<T> = [ok: true, validated: T, violations: []]

/** Failed `validate(...)` tuple with original value and collected violations. */
export type ValidationFailure = [ok: false, validated: unknown, violations: Violation[]]

/**
 * Result tuple returned by `validate(...)` and `validate.sync(...)`.
 *
 * Example:
 * `const [ok, validated, violations] = await validate(value, schema)`
 *
 * Example:
 * `if (ok) validated.name.toUpperCase()`
 */
export type ValidationTuple<T> = ValidationSuccess<T> | ValidationFailure

/** Alias for `ValidationTuple<T>`. */
export type ValidationResult<T> = ValidationTuple<T>

/**
 * Composed validator used by recursive helpers such as `HasProperties(...)` and `Each(...)`.
 *
 * Custom validators should keep `check` aligned with runtime behavior so that
 * inference and sync narrowing stay trustworthy.
 *
 * Example:
 * `const schema: Validator<{ name: string }>`
 */
export interface Validator<T = unknown> {
  readonly check: Predicate<T>;
  run <F extends ValidateLike> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[];
}
