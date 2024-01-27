import type { Key, Validator } from '../../types'
import type Length from '@/constraints/Length'

import unsupported from '@/constraints/unsupported'

export default class LengthValidator<V = unknown> implements Validator<V> {
  public readonly constraint: Length

  constructor (constraint: Length) {
    this.constraint = constraint
  }

  validate (value: V, path: Key[] = []) {
    const { exact, max, min } = this.constraint

    if (!(typeof value === 'string' || Array.isArray(value))) {
      return unsupported(value, path)
    }

    if (exact !== null && exact !== value.length) {
      return { value, path, reason: 'exact' }
    }

    if (max !== null && value.length > max) {
      return { value, path, reason: 'max' }
    }

    if (min !== null && value.length < min) {
      return { value, path, reason: 'min' }
    }

    return null
  }
}