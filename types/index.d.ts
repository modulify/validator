export type Key = string | number
export type Recursive<T> = T | Recursive<T>[]

export interface ConstraintViolation<Value = unknown, Meta = unknown> {
  by: string;
  value: Value;
  path?: Key[];
  reason?: string;
  meta?: Meta;
}

export interface Constraint<V = unknown> {
  name: string;
  toViolation (value: V, path: Key[], reason?: string): ConstraintViolation<V>
}

export type ConstraintCollection<T> = {
  [P in keyof T]: Constraint<T[P]> | Constraint<T[P]>[]
}

export interface Validator<Value = unknown> {
  validate (value: Value, path?: Key[]): ConstraintViolation<Value> | null;
}