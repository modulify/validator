import type {
  Constraint,
  ConstraintCollection,
  ConstraintViolation,
  Key,
} from '../../types'

export default class Collection<T = Record<string, unknown>> implements Constraint<T> {
  public readonly name = '@modulify/validator/Collection'
  public readonly constraints: ConstraintCollection<T>

  constructor (constraints: ConstraintCollection<T>) {
    this.constraints = constraints
  }

  reduce <U, P extends keyof ConstraintCollection<T>> (
    reducer: (accumulator: U, constraint: ConstraintCollection<T>[P], property: P) => U,
    initial: U
  ): U {
    return (Object.keys(this.constraints) as P[]).reduce((accumulator, key) => {
      return reducer(accumulator, this.constraints[key], key)
    }, initial)
  }

  toViolation (value: T, path: Key[], reason: string): ConstraintViolation<T> {
    return {
      by: this.name,
      value,
      path,
      reason,
    }
  }
}