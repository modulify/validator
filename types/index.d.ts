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
export type Checker<T, A extends readonly unknown[] = readonly unknown[]> = (value: T, ...args: A) => boolean

/** Extracts a derived value from the original input before a checker runs. */
export type Extractor<T, V> = (value: T) => V

/** Origin layer that produced a violation. */
export type ViolationKind = 'assertion' | 'validator' | 'runtime'

/** Contract stored in `ViolationCodeRegistry` for a known machine-readable code. */
export type ViolationCodeEntry<
  K extends ViolationKind = ViolationKind,
  N extends string = string,
  A extends readonly unknown[] = readonly unknown[],
> = {
  kind: K;
  name: N;
  args: A;
}

type ResolveViolationEntry<E> =
  [E] extends [never]
    ? ViolationCodeEntry
    : E extends ViolationCodeEntry
      ? E
      : ViolationCodeEntry

type ResolveViolationSubjectCode<COrT extends string | readonly unknown[]> = COrT extends string ? COrT : string
type ResolveViolationSubjectArgs<COrT extends string | readonly unknown[], C extends string> = [COrT] extends [readonly unknown[]]
  ? COrT
  : ViolationArgs<C>

/**
 * Extensible registry of machine-readable violation codes.
 *
 * Consumers can augment this interface in their app code:
 * `declare module '@modulify/validator' { interface ViolationCodeRegistry { 'app.user.conflict': ViolationCodeEntry<'validator', 'user', readonly []> } }`
 *
 * Legacy `never` markers remain supported as a fallback for gradual migration:
 * `declare module '@modulify/validator' { interface ViolationCodeRegistry { 'legacy.code': never } }`
 */
export interface ViolationCodeRegistry {
  'length.exact': ViolationCodeEntry<'assertion', 'hasLength', readonly [exact: number]>;
  'length.max': ViolationCodeEntry<'assertion', 'hasLength', readonly [max: number]>;
  'length.min': ViolationCodeEntry<'assertion', 'hasLength', readonly [min: number]>;
  'length.range': ViolationCodeEntry<'assertion', 'hasLength', readonly [range: readonly [number, number]]>;
  'length.unsupported-type': ViolationCodeEntry<'assertion', 'hasLength', readonly []>;
  'number.exact': ViolationCodeEntry<'assertion', 'hasValue', readonly [exact: number]>;
  'number.max': ViolationCodeEntry<'assertion', 'hasValue', readonly [max: number]>;
  'number.min': ViolationCodeEntry<'assertion', 'hasValue', readonly [min: number]>;
  'number.multiple-of': ViolationCodeEntry<'assertion', 'multipleOf', readonly [step: number]>;
  'number.nan': ViolationCodeEntry<'assertion', 'isNaN', readonly []>;
  'number.range': ViolationCodeEntry<'assertion', 'hasValue', readonly [range: readonly [number, number]]>;
  'number.unsupported-type': ViolationCodeEntry<'assertion', 'hasValue' | 'multipleOf', readonly []>;
  'runtime.rejection': ViolationCodeEntry<'runtime', 'validate', readonly [reason: unknown]>;
  'shape.fields.mismatch': ViolationCodeEntry<
    'validator',
    'shape',
    readonly [selectors: readonly [ObjectShapeFieldSelector, ObjectShapeFieldSelector]]
  >;
  'shape.unknown-key': ViolationCodeEntry<'validator', 'shape', readonly []>;
  'size.exact': ViolationCodeEntry<'assertion', 'hasSize', readonly [exact: number]>;
  'size.max': ViolationCodeEntry<'assertion', 'hasSize', readonly [max: number]>;
  'size.min': ViolationCodeEntry<'assertion', 'hasSize', readonly [min: number]>;
  'size.range': ViolationCodeEntry<'assertion', 'hasSize', readonly [range: readonly [number, number]]>;
  'size.unsupported-type': ViolationCodeEntry<'assertion', 'hasSize', readonly []>;
  'string.email': ViolationCodeEntry<'assertion', 'isEmail', readonly []>;
  'string.ends-with': ViolationCodeEntry<'assertion', 'endsWith', readonly [suffix: string]>;
  'string.pattern': ViolationCodeEntry<'assertion', 'hasPattern', readonly [pattern: RegExp]>;
  'string.starts-with': ViolationCodeEntry<'assertion', 'startsWith', readonly [prefix: string]>;
  'string.unsupported-type': ViolationCodeEntry<
    'assertion',
    'hasPattern' | 'startsWith' | 'endsWith',
    readonly []
  >;
  'tuple.length': ViolationCodeEntry<'validator', 'tuple', readonly [length: number]>;
  'type.array': ViolationCodeEntry<'validator', 'each' | 'tuple', readonly []>;
  'type.bigint': ViolationCodeEntry<'assertion', 'isBigInt', readonly []>;
  'type.blob': ViolationCodeEntry<'assertion', 'isBlob', readonly []>;
  'type.boolean': ViolationCodeEntry<'assertion', 'isBoolean', readonly []>;
  'type.date': ViolationCodeEntry<'assertion', 'isDate', readonly []>;
  'type.file': ViolationCodeEntry<'assertion', 'isFile', readonly []>;
  'type.function': ViolationCodeEntry<'assertion', 'isFunction', readonly []>;
  'type.map': ViolationCodeEntry<'assertion', 'isMap', readonly []>;
  'type.null': ViolationCodeEntry<'assertion', 'isNull', readonly []>;
  'type.number': ViolationCodeEntry<'assertion', 'isNumber', readonly []>;
  'type.record': ViolationCodeEntry<'validator', 'shape' | 'discriminatedUnion' | 'record', readonly []>;
  'type.set': ViolationCodeEntry<'assertion', 'isSet', readonly []>;
  'type.string': ViolationCodeEntry<'assertion', 'isString', readonly []>;
  'type.symbol': ViolationCodeEntry<'assertion', 'isSymbol', readonly []>;
  'union.invalid-discriminator': ViolationCodeEntry<
    'validator',
    'discriminatedUnion',
    readonly [variants: readonly PropertyKey[]]
  >;
  'union.no-match': ViolationCodeEntry<'validator', 'union', readonly [branches: number]>;
  'value.defined': ViolationCodeEntry<'assertion', 'isDefined', readonly []>;
  'value.exact': ViolationCodeEntry<'assertion', 'exact', readonly [expected: unknown]>;
  'value.one-of': ViolationCodeEntry<'assertion', 'oneOf', readonly [values: readonly unknown[]]>;
}

/** Union of all registered machine-readable violation codes. */
export type ViolationCode = Extract<keyof ViolationCodeRegistry, string>

/** Registered codes that provide a full contract entry instead of a legacy `never` marker. */
export type KnownViolationCode = Extract<{
  [C in ViolationCode]:
    [ViolationCodeRegistry[C]] extends [never]
      ? never
      : ViolationCodeRegistry[C] extends ViolationCodeEntry
        ? C
        : never
}[ViolationCode], string>

/** Contract entry derived from `ViolationCodeRegistry`, with a generic fallback for unknown or legacy codes. */
export type ViolationEntry<C extends string = string> = C extends ViolationCode
  ? ResolveViolationEntry<ViolationCodeRegistry[C]>
  : ViolationCodeEntry

/** Tuple of machine-readable arguments associated with a violation code. */
export type ViolationArgs<C extends string = string> = ViolationEntry<C>['args']

/** Origin layer associated with a violation code. */
export type ViolationKindOf<C extends string = string> = ViolationEntry<C>['kind']

/** Constraint name associated with a violation code. */
export type ViolationNameOf<C extends string = string> = ViolationEntry<C>['name']

/** Strict code-driven violation subject for a fully registered violation code. */
export type KnownViolationSubject<C extends KnownViolationCode> = {
  kind: ViolationKindOf<C>;
  name: ViolationNameOf<C>;
  code: C;
  args: ViolationArgs<C>;
}

/** Machine-readable description of a validation failure. */
export type ViolationSubject<
  COrT extends string | readonly unknown[] = string,
  K extends ViolationKind = COrT extends string ? ViolationKindOf<COrT> : ViolationKind,
  C extends string = ResolveViolationSubjectCode<COrT>,
  T extends readonly unknown[] = ResolveViolationSubjectArgs<COrT, C>,
> = [COrT] extends [readonly unknown[]]
  ? {
      kind: K;
      name: string;
      code: C;
      args: T;
    }
  : C extends KnownViolationCode
    ? {
        kind: K & ViolationKindOf<C>;
        name: ViolationNameOf<C>;
        code: C;
        args: T & ViolationArgs<C>;
      }
    : {
        kind: K;
        name: string;
        code: C;
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

/** Read-only machine-readable metadata attached to a constraint. */
export type ConstraintMetadata = Readonly<Record<string, unknown>>

/** Public descriptor entry for additional assertion-level checks. */
export interface AssertionDescriptorConstraint<
  C extends string = string,
  A extends readonly unknown[] = readonly unknown[],
> {
  readonly code: C;
  readonly args: A
}

/** Shared descriptor shape returned by `describe(...)`. */
export interface ConstraintDescriptorBase<K extends string = string> {
  readonly kind: K;
  readonly metadata?: ConstraintMetadata
}

/** Descriptor for leaf assertions created with `assert(...)` or compatible custom assertions. */
export interface AssertionDescriptor<
  C extends string = string,
  A extends readonly unknown[] = readonly unknown[],
  T extends readonly AssertionDescriptorConstraint[] = readonly AssertionDescriptorConstraint[],
> extends ConstraintDescriptorBase<'assertion'> {
  readonly name: string;
  readonly bail: boolean;
  readonly code: C;
  readonly args: A;
  readonly constraints: T
}

/** Generic fallback descriptor for custom validators without structural instrumentation. */
export type ValidatorDescriptor = ConstraintDescriptorBase<'validator'>

/** Public extension descriptor for custom validators that expose their own `describe()` contract. */
export interface CustomConstraintDescriptor<K extends string = string> extends ConstraintDescriptorBase<K> {
  readonly [key: string]: unknown
}

/** Descriptor for sequential arrays of constraints used in a single slot. */
export interface AllOfConstraintDescriptor<
  T extends readonly unknown[] = readonly ConstraintDescriptor[],
> extends ConstraintDescriptorBase<'allOf'> {
  readonly constraints: T
}

/** Descriptor for wrapper combinators such as `optional(...)`. */
export interface WrapperConstraintDescriptor<
  K extends 'optional' | 'nullable' | 'nullish' = 'optional' | 'nullable' | 'nullish',
  C = ConstraintDescriptor,
> extends ConstraintDescriptorBase<K> {
  readonly child: C
}

/** Descriptor for `each(...)`. */
export interface EachConstraintDescriptor<
  C = ConstraintDescriptor,
> extends ConstraintDescriptorBase<'each'> {
  readonly item: C
}

/** Descriptor for `tuple(...)`. */
export interface TupleConstraintDescriptor<
  T extends readonly unknown[] = readonly ConstraintDescriptor[],
> extends ConstraintDescriptorBase<'tuple'> {
  readonly items: T
}

/** Descriptor for `union(...)`. */
export interface UnionConstraintDescriptor<
  T extends readonly unknown[] = readonly ConstraintDescriptor[],
> extends ConstraintDescriptorBase<'union'> {
  readonly branches: T
}

/** Descriptor for `record(...)`. */
export interface RecordConstraintDescriptor<
  C = ConstraintDescriptor,
> extends ConstraintDescriptorBase<'record'> {
  readonly values: C
}

/** Descriptor for `discriminatedUnion(...)`. */
export interface DiscriminatedUnionConstraintDescriptor<
  V = Readonly<Record<PropertyKey, ConstraintDescriptor>>,
> extends ConstraintDescriptorBase<'discriminatedUnion'> {
  readonly key: PropertyKey;
  readonly variants: V
}

/** Machine-readable summary of object-level rules registered on a shape. */
export interface ObjectShapeRuleDescriptorBase<K extends string = string> {
  readonly kind: K;
  readonly metadata?: ConstraintMetadata
}

/** Generic compact descriptor for sync object-level rules added via `.refine(...)`. */
export type GenericObjectShapeRuleDescriptor<
  K extends string = 'refine',
> = ObjectShapeRuleDescriptorBase<K>

/** Descriptor for the built-in `.fieldsMatch(...)` helper. */
export interface FieldsMatchObjectShapeRuleDescriptor<
  Left extends ObjectShapeFieldSelector = ObjectShapeFieldSelector,
  Right extends ObjectShapeFieldSelector = ObjectShapeFieldSelector,
> extends ObjectShapeRuleDescriptorBase<'fieldsMatch'> {
  readonly selectors: readonly [Left, Right]
}

/** Machine-readable summary of object-level rules registered on a shape. */
export type ObjectShapeRuleDescriptor =
  | GenericObjectShapeRuleDescriptor<string>
  | FieldsMatchObjectShapeRuleDescriptor

/** Descriptor for `shape(...)`. */
export interface ShapeConstraintDescriptor<
  F = Readonly<Record<PropertyKey, ConstraintDescriptor>>,
  R extends readonly ObjectShapeRuleDescriptor[] = readonly ObjectShapeRuleDescriptor[],
> extends ConstraintDescriptorBase<'shape'> {
  readonly unknownKeys: UnknownKeysMode;
  readonly fields: F;
  readonly rules: R
}

/** Stable machine-readable description of a constraint tree. */
export type BuiltInConstraintDescriptor =
  | AssertionDescriptor
  | AllOfConstraintDescriptor
  | ValidatorDescriptor
  | WrapperConstraintDescriptor
  | EachConstraintDescriptor
  | TupleConstraintDescriptor
  | UnionConstraintDescriptor
  | RecordConstraintDescriptor
  | DiscriminatedUnionConstraintDescriptor
  | ShapeConstraintDescriptor

/** Stable machine-readable description of a constraint tree. */
export type ConstraintDescriptor = BuiltInConstraintDescriptor | CustomConstraintDescriptor

/**
 * Extra checker pipeline for an assertion.
 *
 * Example:
 * `type LengthConstraint = AssertionConstraint<string, number, [min: number], 'length.min'>`
 */
export type AssertionConstraint<
  T = unknown,
  V = unknown,
  A extends readonly unknown[] = readonly unknown[],
  C extends string = string
> = readonly [
  Extractor<T, V>,
  Checker<V, A>,
  C,
  ...A
]

/** Maps an assertion checker tuple into its public descriptor entry. */
export type DescribeAssertionConstraint<C extends AssertionConstraint> =
  C extends AssertionConstraint<unknown, unknown, infer A, infer Code>
    ? AssertionDescriptorConstraint<Code, A>
    : never

/** Maps an assertion checker tuple into the violation subject it can produce. */
export type AssertionConstraintSubject<C extends AssertionConstraint, N extends string = string> =
  C extends AssertionConstraint<unknown, unknown, infer A, infer Code>
    ? {
        kind: 'assertion';
        name: N;
        code: Code;
        args: A;
      }
    : never

/** Maps assertion checker tuples into their public descriptor entries. */
export type DescribeAssertionConstraintTuple<T extends readonly AssertionConstraint[]> = {
  readonly [K in keyof T]: T[K] extends AssertionConstraint
    ? DescribeAssertionConstraint<T[K]>
    : never
} & ReadonlyArray<DescribeAssertionConstraint<T[number]>>

/**
 * Leaf-level validator that checks a single value and either succeeds with `null`
 * or returns a structured violation.
 *
 * `check` is the synchronous type guard used for inference and sync narrowing.
 */
export type Assertion<
  T = unknown,
  C extends readonly AssertionConstraint[] = readonly AssertionConstraint[],
  Code extends string = string,
  A extends readonly unknown[] = readonly unknown[],
  Name extends string = string,
> = ((value: unknown) => MaybePromise<Omit<Violation<
  {
    kind: 'assertion';
    name: Name;
    code: Code;
    args: A;
  } | AssertionConstraintSubject<C[number], Name>
>, 'path'> | null>) & {
  readonly name: Name;
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
  C extends Assertion<infer T, readonly AssertionConstraint[], string, readonly unknown[], string>
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

type ResolveObjectShapeRefinementIssueCode<COrA extends string | readonly unknown[]> = COrA extends string ? COrA : string
type ResolveObjectShapeRefinementIssueArgs<COrA extends string | readonly unknown[], C extends string> = [COrA] extends [readonly unknown[]]
  ? COrA
  : ViolationArgs<C>

/** Machine-readable issue returned by an object-level shape refinement. */
export type ObjectShapeRefinementIssue<
  COrA extends string | readonly unknown[] = string,
  C extends string = ResolveObjectShapeRefinementIssueCode<COrA>,
  A extends readonly unknown[] = ResolveObjectShapeRefinementIssueArgs<COrA, C>,
> = {
  path?: PropertyKey[];
  code: C;
  args?: [COrA] extends [readonly unknown[]]
    ? A
    : C extends KnownViolationCode
      ? A & ViolationArgs<C>
      : A;
  value?: unknown;
}

/** Sync object-level rule that runs after the base shape has validated successfully. */
export type ObjectShapeRefinement<
  T,
  I extends ObjectShapeRefinementIssue = ObjectShapeRefinementIssue,
> = (
  value: T
) => MaybeMany<I | null | undefined> | null | undefined

type KnownCodeViolation<C extends KnownViolationCode> = Violation<KnownViolationSubject<C>>

type ShapeRefinementIssueSubject<I extends ObjectShapeRefinementIssue> =
  I extends ObjectShapeRefinementIssue<string | readonly unknown[], infer C, infer A>
    ? C extends KnownViolationCode
      ? {
          kind: 'validator';
          name: 'shape' & ViolationNameOf<C>;
          code: C;
          args: A & ViolationArgs<C>;
        }
      : ViolationSubject<A, 'validator', C>
    : never

type ShapeRefinementIssueViolation<I extends ObjectShapeRefinementIssue> =
  I extends ObjectShapeRefinementIssue
    ? Violation<ShapeRefinementIssueSubject<I>>
    : never

type InferObjectDescriptorViolations<D extends ObjectDescriptor> = {
  [K in keyof D]: InferMaybeManyViolations<D[K]>
}[keyof D]

/** Maps a single constraint into the union of violations it can produce. */
export type InferConstraintViolations<C extends Constraint> =
  C extends Assertion<unknown, infer AC, infer Code, infer Args, infer Name>
    ? Violation<{
        kind: 'assertion';
        name: Name;
        code: Code;
        args: Args;
      } | AssertionConstraintSubject<AC[number], Name>>
    : C extends ObjectShape<infer D, infer M, readonly ObjectShapeRuleDescriptor[], infer RI>
      ? KnownCodeViolation<'type.record'>
        | (M extends 'strict' ? KnownCodeViolation<'shape.unknown-key'> : never)
        | InferObjectDescriptorViolations<D>
        | ShapeRefinementIssueViolation<RI>
      : C extends OptionalValidator<infer Child>
        ? InferMaybeManyViolations<Child>
        : C extends NullableValidator<infer Child>
          ? InferMaybeManyViolations<Child>
          : C extends NullishValidator<infer Child>
            ? InferMaybeManyViolations<Child>
            : C extends EachValidator<infer Child>
              ? KnownCodeViolation<'type.array'> | InferMaybeManyViolations<Child>
              : C extends TupleValidator<infer Items>
                ? KnownCodeViolation<'type.array'>
                  | KnownCodeViolation<'tuple.length'>
                  | InferMaybeManyViolations<Items[number]>
                : C extends UnionValidator<infer Branches>
                  ? KnownCodeViolation<'union.no-match'> | InferMaybeManyViolations<Branches[number]>
                  : C extends DiscriminatedUnionValidator<PropertyKey, infer Variants>
                    ? KnownCodeViolation<'type.record'>
                      | KnownCodeViolation<'union.invalid-discriminator'>
                      | InferMaybeManyViolations<Variants[keyof Variants]>
                    : C extends RecordValidator<infer Values>
                      ? KnownCodeViolation<'type.record'> | InferMaybeManyViolations<Values>
                      : C extends Validator
                        ? Violation
                        : never

/** Maps one-or-many constraints into the union of violations they can produce. */
export type InferMaybeManyViolations<C extends MaybeMany<Constraint>> =
  C extends readonly []
    ? never
    : C extends readonly Constraint[]
      ? InferConstraintViolations<C[number]>
      : C extends Constraint
        ? InferConstraintViolations<C>
        : never

/** Successful `validate(...)` tuple with typed `validated` value. */
export type ValidationSuccess<T> = [ok: true, validated: T, violations: []]

/** Failed `validate(...)` tuple with original value and collected violations. */
export type ValidationFailure<V extends Violation = Violation> = [ok: false, validated: unknown, violations: V[]]

/**
 * The result tuple returned by `validate(...)` and `validate.sync(...)`.
 *
 * Example:
 * `const [ok, validated, violations] = await validate(value, schema)`
 *
 * Example:
 * `if (ok) validated.name.toUpperCase()`
 */
export type ValidationTuple<T, V extends Violation = Violation> = ValidationSuccess<T> | ValidationFailure<V>

/** Alias for `ValidationTuple<T>`. */
export type ValidationResult<T, V extends Violation = Violation> = ValidationTuple<T, V>

/** Attaches read-only metadata to a constraint without changing validation semantics. */
export declare const meta: <const C extends Constraint, const M extends ConstraintMetadata>(constraint: C, metadata: M) => C

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

/** Public validator extension contract for participating in `describe(...)` without private runtime knowledge. */
export interface DescribedValidator<
  T = unknown,
  D extends ConstraintDescriptor = ConstraintDescriptor,
> extends Validator<T> {
  describe(): D;
}

/** Identity helper that preserves the exact shape of custom validators, including public descriptors. */
export declare const custom: <const V extends Validator>(validator: V) => V

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
  R extends readonly ObjectShapeRuleDescriptor[] = readonly ObjectShapeRuleDescriptor[],
  RI extends ObjectShapeRefinementIssue = never,
> extends Validator<InferObjectDescriptor<D>> {
  readonly descriptor: D;
  readonly unknownKeys: M;
  refine<const I extends ObjectShapeRefinementIssue = ObjectShapeRefinementIssue>(
    refinement: ObjectShapeRefinement<InferObjectDescriptor<D>, I>
  ): ObjectShape<D, M, [...R, GenericObjectShapeRuleDescriptor<'refine'>], RI | I>;
  refine<
    const I extends ObjectShapeRefinementIssue = ObjectShapeRefinementIssue,
    const RD extends GenericObjectShapeRuleDescriptor<string> = GenericObjectShapeRuleDescriptor<'refine'>
  >(
    refinement: ObjectShapeRefinement<InferObjectDescriptor<D>, I>,
    descriptor: RD
  ): ObjectShape<D, M, [...R, RD], RI | I>;
  fieldsMatch<const K extends readonly [ObjectShapeFieldSelector, ObjectShapeFieldSelector]>(
    keys: K
  ): ObjectShape<D, M, [...R, FieldsMatchObjectShapeRuleDescriptor<K[0], K[1]>], RI | ObjectShapeRefinementIssue<'shape.fields.mismatch'>>;
  strict(): ObjectShape<D, 'strict', R, RI>;
  passthrough(): ObjectShape<D, 'passthrough', R, RI>;
  pick<const K extends readonly (keyof D)[]>(keys: K): ObjectShape<Pick<D, K[number]>, M, [], never>;
  omit<const K extends readonly (keyof D)[]>(keys: K): ObjectShape<Omit<D, K[number]>, M, [], never>;
  partial(): ObjectShape<PartialObjectDescriptor<D>, M, [], never>;
  extend<const E extends ObjectDescriptor>(descriptor: E): ObjectShape<MergeObjectDescriptors<D, E>, M, [], never>;
  merge<const E extends ObjectDescriptor, OM extends UnknownKeysMode, OR extends readonly ObjectShapeRuleDescriptor[]>(
    shape: ObjectShape<E, OM, OR, ObjectShapeRefinementIssue>
  ): ObjectShape<MergeObjectDescriptors<D, E>, M, [], never>;
}

/** Helper that maps a single constraint into its public `describe(...)` result. */
export type DescribeConstraint<C extends Constraint> =
  C extends Assertion<unknown, infer AC, infer Code, infer Args, string>
    ? AssertionDescriptor<Code, Args, DescribeAssertionConstraintTuple<AC>>
    : C extends ObjectShape<infer D, infer M, infer R, ObjectShapeRefinementIssue>
      ? ShapeConstraintDescriptor<DescribeObjectDescriptor<D>, R> & { readonly unknownKeys: M }
      : C extends OptionalValidator<infer Child>
        ? WrapperConstraintDescriptor<'optional', DescribeMaybeMany<Child>>
        : C extends NullableValidator<infer Child>
          ? WrapperConstraintDescriptor<'nullable', DescribeMaybeMany<Child>>
          : C extends NullishValidator<infer Child>
            ? WrapperConstraintDescriptor<'nullish', DescribeMaybeMany<Child>>
            : C extends EachValidator<infer Child>
              ? EachConstraintDescriptor<DescribeMaybeMany<Child>>
              : C extends TupleValidator<infer Items>
                ? TupleConstraintDescriptor<DescribeConstraintTuple<Items>>
                : C extends UnionValidator<infer Branches>
                  ? UnionConstraintDescriptor<DescribeConstraintTuple<Branches>>
                  : C extends DiscriminatedUnionValidator<PropertyKey, infer Variants>
                    ? DiscriminatedUnionConstraintDescriptor<DescribeObjectDescriptor<Variants>>
                    : C extends RecordValidator<infer Values>
                      ? RecordConstraintDescriptor<DescribeMaybeMany<Values>>
                      : C extends DescribedValidator<unknown, infer D>
                        ? D & { readonly metadata?: ConstraintMetadata }
                        : C extends Validator
                          ? ValidatorDescriptor
                          : never

/** Helper that maps a one-or-many constraint slot into its public `describe(...)` result. */
export type DescribeMaybeMany<C extends MaybeMany<Constraint>> =
  C extends readonly [infer Only]
    ? Only extends Constraint
      ? DescribeConstraint<Only>
      : never
    : C extends readonly [Constraint, Constraint, ...Constraint[]]
      ? AllOfConstraintDescriptor<DescribeConstraintTuple<C>>
      : C extends readonly Constraint[]
        ? DescribeConstraint<C[number]> | AllOfConstraintDescriptor
        : C extends Constraint
          ? DescribeConstraint<C>
          : never

/** Helper that maps object descriptors into their `describe(...)` field tree. */
export type DescribeObjectDescriptor<D extends ObjectDescriptor> = {
  [K in keyof D]: DescribeMaybeMany<D[K]>
}

/** Helper that maps tuples of constraints into tuples of descriptors. */
export type DescribeConstraintTuple<T extends readonly MaybeMany<Constraint>[]> = {
  readonly [K in keyof T]: DescribeMaybeMany<T[K]>
} & ReadonlyArray<DescribeMaybeMany<T[number]>>

declare const optionalValidatorBrand: unique symbol
declare const nullableValidatorBrand: unique symbol
declare const nullishValidatorBrand: unique symbol
declare const eachValidatorBrand: unique symbol
declare const tupleValidatorBrand: unique symbol
declare const unionValidatorBrand: unique symbol
declare const discriminatedUnionValidatorBrand: unique symbol
declare const recordValidatorBrand: unique symbol

/** Typed validator returned by `optional(...)`. */
export type OptionalValidator<C extends MaybeMany<Constraint> = MaybeMany<Constraint>> =
  Validator<InferConstraints<C> | undefined> & {
    readonly [optionalValidatorBrand]: C
  }

/** Typed validator returned by `nullable(...)`. */
export type NullableValidator<C extends MaybeMany<Constraint> = MaybeMany<Constraint>> =
  Validator<InferConstraints<C> | null> & {
    readonly [nullableValidatorBrand]: C
  }

/** Typed validator returned by `nullish(...)`. */
export type NullishValidator<C extends MaybeMany<Constraint> = MaybeMany<Constraint>> =
  Validator<InferConstraints<C> | null | undefined> & {
    readonly [nullishValidatorBrand]: C
  }

/** Typed validator returned by `each(...)`. */
export type EachValidator<C extends MaybeMany<Constraint> = MaybeMany<Constraint>> =
  Validator<InferConstraints<C>[]> & {
    readonly [eachValidatorBrand]: C
  }

/** Typed validator returned by `tuple(...)`. */
export type TupleValidator<T extends readonly MaybeMany<Constraint>[] = readonly MaybeMany<Constraint>[]> =
  Validator<{
    -readonly [K in keyof T]: InferConstraints<T[K]>
  }> & {
    readonly [tupleValidatorBrand]: T
  }

/** Typed validator returned by `union(...)`. */
export type UnionValidator<T extends readonly MaybeMany<Constraint>[] = readonly MaybeMany<Constraint>[]> =
  Validator<{
    [K in keyof T]: InferConstraints<T[K]>
  }[number]> & {
    readonly [unionValidatorBrand]: T
  }

/** Typed validator returned by `discriminatedUnion(...)`. */
export type DiscriminatedUnionValidator<
  K extends PropertyKey = PropertyKey,
  T extends Record<PropertyKey, MaybeMany<Constraint>> = Record<PropertyKey, MaybeMany<Constraint>>,
> = Validator<{
  [P in keyof T]: InferConstraints<T[P]>
}[keyof T]> & {
  readonly [discriminatedUnionValidatorBrand]: {
    readonly key: K;
    readonly variants: T;
  }
}

/** Typed validator returned by `record(...)`. */
export type RecordValidator<C extends MaybeMany<Constraint> = MaybeMany<Constraint>> =
  Validator<Record<string, InferConstraints<C>>> & {
    readonly [recordValidatorBrand]: C
  }

/** Returns a stable machine-readable description of a constraint tree. */
export declare const describe: <const C extends Constraint>(constraint: C) => DescribeConstraint<C>
