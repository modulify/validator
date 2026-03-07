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

type InferTuple<T extends readonly MaybeMany<Constraint>[]> = {
  -readonly [K in keyof T]: InferConstraints<T[K]>
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

export const tuple = <const T extends readonly MaybeMany<Constraint>[]>(constraints: T): Validator<InferTuple<T>> => ({
  check(value: unknown): value is InferTuple<T> {
    return isArray(value)
      && value.length === constraints.length
      && constraints.every((constraint, index) => matchesConstraints(value[index], constraint))
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    if (!isArray(value)) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'tuple', code: 'type.array', args: [] },
      }]] as Validation<F>[]
    }

    if (value.length !== constraints.length) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'tuple', code: 'tuple.length', args: [constraints.length] },
      }]] as Validation<F>[]
    }

    return constraints.map((constraint, index) => validate(value[index], constraint, [...path, index]) as Validation<F>)
  },
})

export const record = <const C extends MaybeMany<Constraint>>(constraints: C): Validator<Record<string, InferConstraints<C>>> => ({
  check(value: unknown): value is Record<string, InferConstraints<C>> {
    return isRecord(value) && Object.values(value).every(item => matchesConstraints(item, constraints))
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    if (!isRecord(value)) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'record', code: 'type.record', args: [] },
      }]] as Validation<F>[]
    }

    return Object.keys(value).map(key => validate(value[key], constraints, [...path, key]) as Validation<F>)
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
