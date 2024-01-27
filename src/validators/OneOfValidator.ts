import type { Key, Validator } from '../../types'
import type OneOf from '@/constraints/OneOf'

export default class OneOfValidator<Expected = unknown, Actual = unknown> implements Validator<Actual> {
  public readonly constraint: OneOf<Expected>

  constructor (constraint: OneOf<Expected>) {
    this.constraint = constraint
  }

  validate (value: Actual, path: Key[] = []) {
    const equalTo = this.constraint.equalTo

    if (!this.constraint.values.some(v => equalTo(v, value))) {
      return { value, path }
    }

    return null
  }
}