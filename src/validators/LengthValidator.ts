import type { Key, Validator } from '../../types'
import type Length from '@/constraints/Length'

export default class LengthValidator<V = unknown> implements Validator<V> {
  public readonly constraint: Length<V>

  constructor (constraint: Length<V>) {
    this.constraint = constraint
  }

  validate (value: V, path: Key[] = []) {
    const constraint = this.constraint
    const { exact, max, min } = constraint

    if (!(typeof value === 'string' || Array.isArray(value))) {
      return constraint.toViolation(value, path, 'unsupported')
    }

    if (exact !== null && exact !== value.length) {
      return constraint.toViolation(value, path, 'exact')
    }

    if (max !== null && value.length > max) {
      return constraint.toViolation(value, path, 'max')
    }

    if (min !== null && value.length < min) {
      return constraint.toViolation(value, path, 'min')
    }

    return null
  }
}