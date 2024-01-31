import type {
  Constraint,
  ConstraintViolation,
  Key,
} from '../../types'

export default class Exists<T = unknown> implements Constraint<T> {
  public readonly name = '@modulify/validator/Exists'

  toViolation (value: T, path: Key[]): ConstraintViolation<T> {
    return {
      by: this.name,
      value,
      path,
      reason: 'undefined',
    }
  }
}