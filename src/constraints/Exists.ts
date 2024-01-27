import type { Constraint } from '../../types'

export default class Exists<T = unknown> implements Constraint<T> {
  public readonly name = '@modulify/validator/Exists'
}