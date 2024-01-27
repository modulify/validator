import type {
  Constraint,
  ConstraintCollection,
} from '../../types'

export default class Collection<T = Record<string, unknown>> implements Constraint {
  public readonly name = '@modulify/validator/Collection'
  public readonly constraints: ConstraintCollection<T>

  constructor (constraints: ConstraintCollection<T>) {
    this.constraints = constraints
  }
}