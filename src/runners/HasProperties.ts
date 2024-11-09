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

export default <T extends object>(descriptor: Descriptor<T>) => ({
  run <F extends Validate | ValidateSync> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    if (isRecord(value)) {
      const fields = Object.keys(descriptor) as Array<keyof Descriptor<T>>

      return fields.reduce((accumulator, key) => [
        ...accumulator,
        validate(value[key], descriptor[key], [...path, key]) as Validation<F>,
      ], [] as Validation<F>[])
    } else {
      return [
        [{
          value,
          path,
          violates: '@modulify/validator/HasProperties',
          reason: 'unsupported',
        }],
      ] as Validation<F>[]
    }
  },
} as ValidationRunner)
