import type {
  Constraint,
  MaybeMany,
  Validate,
  ValidateSync,
  Validation,
  ValidationRunner,
} from '~types'

import { isArray } from '@/predicates'

export default (constraints: MaybeMany<Constraint>) => {
  return {
    run <F extends Validate | ValidateSync> (
      validate: F,
      value: unknown,
      path: PropertyKey[]
    ): Validation<F>[] {
      return isArray(value)
        ? value.map((v, i) => validate(v, constraints, [...path, i])) as Validation<F>[]
        : [validate(value, constraints, [...path])] as Validation<F>[]
    },
  } as ValidationRunner
}