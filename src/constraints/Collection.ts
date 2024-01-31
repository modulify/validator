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

  toViolation (value: T, path: Key[], reason: string): ConstraintViolation<T> {
    return {
      by: this.name,
      value,
      path,
      reason,
    }
  }
}