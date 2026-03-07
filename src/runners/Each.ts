import type {
  Constraint,
  InferConstraints,
  MaybeMany,
  Validate,
  ValidateSync,
  Validation,
  Validator,
} from '~types'

import { matchesConstraints } from '@/constraints'
import { isArray } from '@/predicates'

export default <const C extends MaybeMany<Constraint>>(constraints: C): Validator<InferConstraints<C>[]> => ({
  check(value: unknown): value is InferConstraints<C>[] {
    return isArray(value) && value.every(item => matchesConstraints(item, constraints))
  },
  run <F extends Validate | ValidateSync> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    return isArray(value)
      ? value.map((item, index) => validate(item, constraints, [...path, index])) as Validation<F>[]
      : [[{
        value,
        path,
        violates: { predicate: 'isArray', rule: 'Each', args: [] },
      }]] as Validation<F>[]
  },
})
