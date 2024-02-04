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

export interface ConstraintValidator<Value = unknown> {
  validate (value: Value, path?: Key[]): ConstraintViolation<Value> | null;
}

export interface Provider {
  get (constraint: Constraint): ConstraintValidator | null;
  override (provider: Provider): Provider;
}

export declare class ProviderChain implements Provider {
  constructor (
    current?: Provider | null,
    previous?: Provider | null
  );

  get (constraint: Constraint): ConstraintValidator | null;
  override (provider: Provider): Provider;
}

export interface Validator {
  override (provider: Provider): Validator;

  validate<Value>(
    value: Value,
    constraints: Constraint<Value> | Constraint<Value>[],
  ): ConstraintViolation[]
}