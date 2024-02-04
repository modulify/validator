import type {
  Constraint,
  ConstraintViolation,
  Key,
} from '../../types'

type EqualPredicate<Expected> = (a: Expected, b: unknown) => boolean

export default class OneOf<Expected = unknown, Actual = unknown> implements Constraint<Actual> {
  public readonly name = '@modulify/validator/OneOf'
  public readonly values: Expected[]
  public readonly equalTo: EqualPredicate<Expected>

  constructor (
    values: Expected[] | Record<string, Expected>,
    equalTo: EqualPredicate<Expected> = (a: Expected, b: unknown) => a === b
  ) {
    this.values = Array.isArray(values) ? values : Object.values(values)
    this.equalTo = equalTo
  }

  toViolation (value: Actual, path: Key[]): ConstraintViolation<Actual> {
    return {
      by: this.name,
      value,
      path,
    }
  }
}