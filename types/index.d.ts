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

/** Extracts a derived value from the original input before a checker runs. */
export type Extractor<T, V> = (value: T) => V

/** Origin layer that produced a violation. */
export type ViolationKind = 'assertion' | 'validator' | 'runtime'

/** Machine-readable description of a validation failure. */
export type ViolationSubject<
  T extends unknown[] = unknown[],
  K extends ViolationKind = ViolationKind
> = {
  kind: K;
  name: string;
  code: string;
  args: T;
}

/**
 * Structured validation error returned by assertions and composed validators.
 *
 * `path` points to the nested property or array index that failed.
 *
 * Example:
 * `violation.violates.code === 'length.min'`
 */
export type Violation<S extends ViolationSubject = ViolationSubject> = {
  value: unknown;
  path?: PropertyKey[];
  violates: S;
}

/** Read-only utility wrapper for working with `Violation[]` results. */
export declare class ViolationCollection<V extends Violation = Violation> implements Iterable<V> {
  constructor(violations: readonly V[]);
  readonly size: number;
  [Symbol.iterator](): Iterator<V>;
  forEach(callback: (violation: V, index: number, collection: ViolationCollection<V>) => void): void;
  map<T>(callback: (violation: V, index: number, collection: ViolationCollection<V>) => T): T[];
  at(path: readonly PropertyKey[]): ViolationCollection<V>;
  tree(): ViolationTreeNode<V>;
}

/** Tree node built from a `ViolationCollection` for nested path traversal. */
export type ViolationTreeNode<V extends Violation = Violation> = {
  readonly path: readonly PropertyKey[];
  readonly self: ViolationCollection<V>;
  readonly subtree: ViolationCollection<V>;
  readonly children: ReadonlyMap<PropertyKey, ViolationTreeNode<V>>;
  at(path: readonly PropertyKey[]): ViolationTreeNode<V> | undefined;
}

/** Standard entrypoint for wrapping `Violation[]` into a collection utility API. */
export declare const collection: <V extends Violation>(violations: readonly V[]) => ViolationCollection<V>

/**
 * Extra checker pipeline for an assertion.
 *
 * Example:
 * `type LengthConstraint = AssertionConstraint<string, number, [min: number], 'length.min'>`
 */
export type AssertionConstraint<
  T = unknown,
  V = unknown,
  A extends unknown[] = unknown[],
  C extends string = string
> = [
  Extractor<T, V>,
  Checker<V, A>,
  C,
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
 * `shape(...)`, and `each(...)`.
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
 * `InferConstraints<typeof shape({ name: [isDefined, isString] })> // { name: string }`
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

/** Controls how object shapes handle keys missing from the descriptor. */
export type UnknownKeysMode = 'passthrough' | 'strict'

/** Field selector accepted by shape helpers that can point to the current level or a nested path. */
export type ObjectShapeFieldSelector = PropertyKey | readonly PropertyKey[]

/** Machine-readable issue returned by an object-level shape refinement. */
export type ObjectShapeRefinementIssue<A extends unknown[] = unknown[]> = {
  path?: PropertyKey[];
  code: string;
  args?: A;
  value?: unknown;
}

/** Sync object-level rule that runs after the base shape has validated successfully. */
export type ObjectShapeRefinement<T> = (
  value: T
) => MaybeMany<ObjectShapeRefinementIssue | null | undefined> | null | undefined

/** Successful `validate(...)` tuple with typed `validated` value. */
export type ValidationSuccess<T> = [ok: true, validated: T, violations: []]

/** Failed `validate(...)` tuple with original value and collected violations. */
export type ValidationFailure = [ok: false, validated: unknown, violations: Violation[]]

/**
 * The result tuple returned by `validate(...)` and `validate.sync(...)`.
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
 * Composed validator used by recursive helpers such as `shape(...)` and `each(...)`.
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

/** Descriptor that maps object keys to one or many constraints. */
export type ObjectDescriptor = Record<PropertyKey, MaybeMany<Constraint>>

/** Runtime type inferred from an object descriptor. */
export type InferObjectDescriptor<D extends ObjectDescriptor> = {
  [K in keyof D]: InferConstraints<D[K]>
}

/** Descriptor produced by `.partial()` where every field accepts `undefined`. */
export type PartialObjectDescriptor<D extends ObjectDescriptor> = {
  [K in keyof D]: Validator<InferConstraints<D[K]> | undefined>
}

/** Utility type for overriding descriptor keys from left to right. */
export type MergeObjectDescriptors<
  Left extends ObjectDescriptor,
  Right extends ObjectDescriptor,
> = Omit<Left, keyof Right> & Right

/**
 * Object-aware validator with descriptor introspection and immutable shape helpers.
 *
 * Example:
 * `const user = shape({ name: isString }).strict()`
 */
export interface ObjectShape<
  D extends ObjectDescriptor = ObjectDescriptor,
  M extends UnknownKeysMode = 'passthrough',
> extends Validator<InferObjectDescriptor<D>> {
  readonly descriptor: D;
  readonly unknownKeys: M;
  refine(refinement: ObjectShapeRefinement<InferObjectDescriptor<D>>): ObjectShape<D, M>;
  fieldsMatch<const K extends readonly [ObjectShapeFieldSelector, ObjectShapeFieldSelector]>(keys: K): ObjectShape<D, M>;
  strict(): ObjectShape<D, 'strict'>;
  passthrough(): ObjectShape<D, 'passthrough'>;
  pick<const K extends readonly (keyof D)[]>(keys: K): ObjectShape<Pick<D, K[number]>, M>;
  omit<const K extends readonly (keyof D)[]>(keys: K): ObjectShape<Omit<D, K[number]>, M>;
  partial(): ObjectShape<PartialObjectDescriptor<D>, M>;
  extend<const E extends ObjectDescriptor>(descriptor: E): ObjectShape<MergeObjectDescriptors<D, E>, M>;
  merge<const E extends ObjectDescriptor, OM extends UnknownKeysMode>(
    shape: ObjectShape<E, OM>
  ): ObjectShape<MergeObjectDescriptors<D, E>, M>;
}
