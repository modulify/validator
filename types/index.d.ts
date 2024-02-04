export type Key = string | number
export type Recursive<T> = T | Recursive<T>[]

export interface ConstraintViolation<Value = unknown, Meta = unknown> {
  by: string;
  value: Value;
  path?: Key[];
  reason?: string;
  meta?: Meta;
}

export interface Constraint<Value = unknown> {
  name: string;
  toViolation (value: Value, path: Key[], reason?: string): ConstraintViolation<Value>
}

export type ConstraintCollection<T> = {
  [P in keyof T]: Constraint<T[P]> | Constraint<T[P]>[]
}

/**
 * Works only with a specific constraint
 */
export interface ConstraintValidator<Value = unknown> {
  validate (value: Value, path?: Key[]): ConstraintViolation<Value> | null;
}

/**
 * Used by Validator|FunctionalValidator to determine, how a specific constraint should be validated.
 */
export interface Provider {
  get (constraint: Constraint): ConstraintValidator | null;
  override (provider: Provider): Provider;
}

export type FunctionalValidator = <Value>(
  provider: Provider,
  value: Value,
  constraints: Constraint<Value> | Constraint<Value>[],
  path?: Key[]
) => ConstraintViolation[]

export interface Validator {
  override (provider: Provider): Validator;

  validate<Value>(
    value: Value,
    constraints: Constraint<Value> | Constraint<Value>[],
  ): ConstraintViolation[]
}

export declare class Collection<T = Record<string, unknown>> implements Constraint<T> {
  public readonly name = '@modulify/validator/Collection'
  public readonly constraints: ConstraintCollection<T>

  constructor (constraints: ConstraintCollection<T>);

  toViolation (value: T, path: Key[], reason: string): ConstraintViolation<T>;
}

export default class Exists implements Constraint {
  public readonly name = '@modulify/validator/Exists'

  toViolation (value: unknown, path: Key[]): ConstraintViolation;
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