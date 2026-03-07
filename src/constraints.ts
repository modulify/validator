import type {
  Constraint,
  InferConstraints,
  MaybeMany,
  Validator,
} from '~types'

export const isValidator = <T = unknown>(constraint: Constraint<T>): constraint is Validator<T> => 'run' in constraint

export function arrayify<T>(value: MaybeMany<T>): T[] {
  return Array.isArray(value)
    ? [...value]
    : [value]
}

export function matchesConstraints<C extends MaybeMany<Constraint>>(
  value: unknown,
  constraints: C
): value is InferConstraints<C> {
  return arrayify(constraints).every(constraint => constraint.check(value))
}
