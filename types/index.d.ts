export interface Constraint<T = unknown> {
  name: string
}

export type ConstraintCollection<T> = {
  [P in keyof T]: Constraint<T[P]> | Constraint<T[P]>[]
}

export type Key = string | number

export interface ConstraintViolation<V = unknown> {
  value: V;
  path?: Key[];
  reason?: string;
}

export interface Validator<V = unknown> {
  validate (value: V, path?: Key[]): ConstraintViolation<V> | null;
}