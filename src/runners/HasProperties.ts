import {
  Constraint,
  InferConstraints,
  MaybeMany,
  Validate,
  ValidateSync,
  Validation,
  Validator,
} from '~types'

import { matchesConstraints } from '@/constraints'
import { isRecord } from '@/predicates'

export type Descriptor = Record<PropertyKey, MaybeMany<Constraint>>

export type InferDescriptor<D extends Descriptor> = {
  [K in keyof D]: InferConstraints<D[K]>
}

const keysOf = <T extends object>(value: T) => Object.keys(value) as Array<keyof T>

export default <const D extends Descriptor>(descriptor: D): Validator<InferDescriptor<D>> => {
  const keys = keysOf(descriptor)

  return {
    check(value: unknown): value is InferDescriptor<D> {
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
        violates: { kind: 'validator', name: 'HasProperties', code: 'type.record', args: [] },
      }]] as Validation<F>[],
  }
}
