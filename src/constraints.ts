import type {
  Assertion,
  CompatibleConstraints,
  Constraint,
  InferConstraints,
  MaybeMany,
  Validator,
} from '~types'

import {
  checkRefinementAssertion,
  isRefinementAssertion,
} from '@/assert'

export const isValidator = <T = unknown>(constraint: Constraint<T>): constraint is Validator<T> => 'run' in constraint

export function arrayify<T>(value: MaybeMany<T>): T[] {
  return Array.isArray(value)
    ? [...value]
    : [value]
}

export function matchesConstraints<C extends MaybeMany<Constraint>>(
  value: unknown,
  constraints: CompatibleConstraints<C>
): value is InferConstraints<C> {
  let establishedDomain = false

  return arrayify(constraints).every(constraint => {
    if (isValidator(constraint)) {
      establishedDomain = false

      return constraint.check(value)
    }

    if (!establishedDomain && isRefinementAssertion(constraint)) {
      return false
    }

    const matched = establishedDomain && isRefinementAssertion(constraint)
      ? checkRefinementAssertion(constraint as Assertion, value)
      : constraint.check(value)

    if (matched) {
      establishedDomain = true
    }

    return matched
  })
}
