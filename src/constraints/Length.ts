import type { Constraint } from '../../types'

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
}