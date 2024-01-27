import type { Constraint } from '../../types'

export default class OneOf<Expected = unknown, Actual = unknown> implements Constraint<Actual> {
  public readonly name = '@modulify/validator/OneOf'
  public readonly values: Expected[]
  public readonly equalTo: ((a: Expected, b: unknown) => boolean)

  constructor (
    values: Expected[] | Record<string, Expected>,
    equalTo = (a: Expected, b: unknown) => a === b
  ) {
    this.values = Array.isArray(values) ? values : Object.values(values)
    this.equalTo = equalTo
  }
}