import type {
  ConstraintValidator,
  Key,
} from '../../types'

import type OneOf from '@/constraints/OneOf'

export default class OneOfValidator<
  Allowed = unknown,
  Actual = unknown
> implements ConstraintValidator<Actual> {
  public readonly constraint: OneOf<Allowed, Actual>

  constructor (constraint: OneOf<Allowed, Actual>) {
    this.constraint = constraint
  }

  validate (value: Actual, path: Key[] = []) {
    const equalTo = this.constraint.equalTo

    if (!this.constraint.values.some(allowed => equalTo(allowed, value))) {
      return this.constraint.toViolation(value, path)
    }

    return null
  }
}