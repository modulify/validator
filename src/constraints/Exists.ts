import type {
  Constraint,
  ConstraintViolation,
  Key,
} from '../../types'

export default class Exists implements Constraint {
  public readonly name = '@modulify/validator/Exists'

  toViolation (value: unknown, path: Key[]): ConstraintViolation {
    return {
      by: this.name,
      value,
      path,
      reason: 'undefined',
    }
  }
}