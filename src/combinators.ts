import type {
  Constraint,
  InferConstraints,
  MaybeMany,
  Validate,
  ValidateSync,
  Validation,
  Validator,
} from '~types'

import { assert } from '@/assert'
import { matchesConstraints } from '@/constraints'
import {
  isArray,
  isExact,
  isNull,
  isRecord,
  isUndefined,
} from '@/predicates'

export type ShapeDescriptor = Record<PropertyKey, MaybeMany<Constraint>>

export type InferShape<D extends ShapeDescriptor> = {
  [K in keyof D]: InferConstraints<D[K]>
}

const passthrough = <const C extends MaybeMany<Constraint>, Accepted>(
  accepts: (value: unknown) => value is Accepted,
  constraints: C
): Validator<InferConstraints<C> | Accepted> => ({
  check(value: unknown): value is InferConstraints<C> | Accepted {
    return accepts(value) || matchesConstraints(value, constraints)
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    return accepts(value)
      ? []
      : [validate(value, constraints, path) as Validation<F>]
  },
})

const keysOf = <T extends object>(value: T) => Object.keys(value) as Array<keyof T>

export const each = <const C extends MaybeMany<Constraint>>(constraints: C): Validator<InferConstraints<C>[]> => ({
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
        violates: { kind: 'validator', name: 'each', code: 'type.array', args: [] },
      }]] as Validation<F>[]
  },
})

export const shape = <const D extends ShapeDescriptor>(descriptor: D): Validator<InferShape<D>> => {
  const keys = keysOf(descriptor)

  return {
    check(value: unknown): value is InferShape<D> {
      return isRecord(value) && keys.every(key => matchesConstraints(value[key], descriptor[key]))
    },
    run: <F extends Validate | ValidateSync> (
      validate: F,
      value: unknown,
      path: PropertyKey[]
    ): Validation<F>[] => isRecord(value)
      ? keys.reduce<Validation<F>[]>((all, key) => [
        ...all,
        validate(value[key], descriptor[key], [...path, key]) as Validation<F>,
      ], [])
      : [[{
        value,
        path,
        violates: { kind: 'validator', name: 'shape', code: 'type.record', args: [] },
      }]] as Validation<F>[],
  }
}

export const exact = <const T>(value: T) => assert(isExact(value), {
  name: 'exact',
  bail: true,
  code: 'value.exact',
  args: [value],
})

export const optional = <const C extends MaybeMany<Constraint>>(constraints: C) => passthrough(
  isUndefined,
  constraints
)

export const nullable = <const C extends MaybeMany<Constraint>>(constraints: C) => passthrough(
  isNull,
  constraints
)

export const nullish = <const C extends MaybeMany<Constraint>>(constraints: C) => passthrough(
  (value: unknown): value is null | undefined => isNull(value) || isUndefined(value),
  constraints
)
