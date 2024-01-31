import type {
  Constraint,
  ConstraintViolation,
  Key,
} from '../../types'

export default class Length<T = unknown> implements Constraint<T> {
  public readonly name = '@modulify/validator/Length'

  public readonly exact: number | null
  public readonly max: number | null
  public readonly min: number | null

  constructor (options: {
    exact?: number
    max?: number
    min?: number
  }) {
    this.exact = options.exact ?? null
    this.max = options.max ?? null
    this.min = options.min ?? null
  }

  toViolation (value: T, path: Key[], reason: 'exact' | 'max' | 'min' | 'unsupported'): ConstraintViolation<T> {
    return {
      by: this.name,
      value,
      path,
      reason,
      meta: {
        exact: this.exact,
        max: this.max,
        min: this.min,
      }[reason]
    }
  }
}