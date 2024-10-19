export type Key = PropertyKey
export type Recursive<T> = T | Recursive<T>[]

export interface ConstraintViolation<Value = unknown, Meta = unknown> {
  by: string | symbol;
  value: Value;
  /** Path to a property, if a constraint is used as part of a `Collection` for checking some object's structure */
  path?: PropertyKey[];
  reason?: string | symbol;
  meta?: Meta;
}

export interface Constraint<Value = unknown> {
  name: string;
  toViolation (value: Value, path: PropertyKey[], reason?: string): ConstraintViolation<Value>
}

export type ConstraintCollection<T> = {
  [P in keyof T]: Constraint<T[P]> | Constraint<T[P]>[]
}

/**
 * Works only with a specific constraint
 */
export interface ConstraintValidator<Value = unknown> {
  validate (value: Value, path?: PropertyKey[]): ConstraintViolation<Value> | null | Promise<ConstraintViolation<Value> | null>;
}

/**
 * Used by Validator|FunctionalValidator to determine, how a specific constraint should be validated.
 */
export interface Provider {
  get (constraint: Constraint): ConstraintValidator | null;
  override (provider: Provider): Provider;
}

type MaybePromise<
  Value,
  Asynchronously extends boolean = true
> = Asynchronously extends true ? Promise<Value> : Value

export type FunctionalValidator = <Value, Asynchronously extends boolean = true>(
  provider: Provider,
  value: Value,
  constraints: Constraint<Value> | Constraint<Value>[],
  path?: PropertyKey[],
  asynchronously?: Asynchronously
) => MaybePromise<ConstraintViolation[], Asynchronously>

export interface Validator {
  override (provider: Provider): Validator;

  validate<Value, Asynchronously extends boolean = true>(
    value: Value,
    constraints: Constraint<Value> | Constraint<Value>[],
    asynchronously?: Asynchronously
  ): MaybePromise<ConstraintViolation[], Asynchronously>
}

export declare class Collection<T = Record<string, unknown>> implements Constraint<T> {
  public readonly name = '@modulify/validator/Collection'
  public readonly constraints: ConstraintCollection<T>

  constructor (constraints: ConstraintCollection<T>);

  toViolation (value: T, path: PropertyKey[], reason: string): ConstraintViolation<T>;
}

/**
 * If the value should be defined. Interrupts validation of a value, if it produces a violation
 */
export declare class Exists implements Constraint {
  public readonly name = '@modulify/validator/Exists'

  toViolation (value: unknown, path: PropertyKey[]): ConstraintViolation;
}

export declare class Length<Value = unknown> implements Constraint<Value> {
  public readonly name = '@modulify/validator/Length'

  public readonly exact: number | null
  public readonly max: number | null
  public readonly min: number | null

  constructor (options: {
    exact?: number
    max?: number
    min?: number
  });

  toViolation (
    value: Value,
    path: PropertyKey[],
    reason: 'exact' | 'max' | 'min' | 'unsupported'
  ): ConstraintViolation<Value, number>;
}

type EqualPredicate<Expected> = (a: Expected, b: unknown) => boolean

export declare class OneOf<Expected = unknown, Actual = unknown> implements Constraint<Actual> {
  public readonly name = '@modulify/validator/OneOf'
  public readonly values: Expected[]
  public readonly equalTo: EqualPredicate<Expected>

  /**
   * @param values Array of allowed values
   * @param equalTo Defaults to strict comparison via `===`
   */
  constructor (
    values: Expected[] | Record<string, Expected>,
    equalTo?: EqualPredicate<Expected>
  );

  toViolation (value: Actual, path: PropertyKey[]): ConstraintViolation<Actual>;
}

export declare class ProviderChain implements Provider {
  constructor (
    current?: Provider | null,
    previous?: Provider | null
  );

  get (constraint: Constraint): ConstraintValidator | null;

  override (provider: Provider): Provider;
}

export declare const createValidator: (provider?: Provider | null) => Validator;

export declare const validate: FunctionalValidator;