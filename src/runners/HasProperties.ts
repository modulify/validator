import {
  Constraint,
  MaybeMany,
  Validate,
  ValidateSync,
  Validation,
  ValidationRunner,
} from '~types'

import { isRecord } from '@/predicates'

export type Descriptor<T extends object> = {
  [P in keyof T]: MaybeMany<Constraint>
}

const keysOf = <T extends object>(value: T) => Object.keys(value) as Array<keyof T>

export default <T extends object>(descriptor: Descriptor<T>): ValidationRunner => ({
  run: <F extends Validate | ValidateSync> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] => isRecord(value)
    ? keysOf(descriptor).reduce<Validation<F>[]>((all, key) => [
      ...all,
      validate(value[key], descriptor[key], [...path, key]) as Validation<F>,
    ], [])
    : [[{
      value,
      path,
      violates: '@modulify/validator/HasProperties',
      reason: 'unsupported',
    }]] as Validation<F>[],
})
