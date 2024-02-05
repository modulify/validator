import type {
  Constraint,
  ConstraintViolation,
  Key,
} from '../../types'

import { arraify } from '@/utils'

export default class Each implements Constraint {
  public readonly name = '@modulify/validator/Each'
  public readonly constraints: Constraint[]

  constructor (constraints: Constraint | Constraint[]) {
    this.constraints = arraify(constraints)
  }

  toViolation (value: unknown, path: Key[], reason?: string): ConstraintViolation {
    return {
      by: this.name,
      value,
      path,
      reason,
    }
  }
}