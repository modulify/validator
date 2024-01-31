import type {
  Constraint,
  ConstraintViolation,
  Recursive,
  Validator,
} from '../types'

import Collection from '@/constraints/Collection'
import Exists from '@/constraints/Exists'

import Length from '@/constraints/Length'
import LengthValidator from '@/validators/LengthValidator'

import OneOf from '@/constraints/OneOf'
import OneOfValidator from '@/validators/OneOfValidator'

import {
  arraify,
  flatten,
} from '@/utils'

const provider = {
  get (constraint: Constraint): Validator {
    switch (true) {
      case constraint instanceof Length:
        return new LengthValidator(constraint)
      case constraint instanceof OneOf:
        return new OneOfValidator(constraint)
    }
  }
}

const constructorOf = (value: object): unknown => {
  return Object.getPrototypeOf(value).constructor
}

const isRecord = (value: object): boolean => {
  return constructorOf(value) === Object && Object.keys(Object.getPrototypeOf(value)).length === 0
}

const validate = <T>(
  value: T,
  constraints: Constraint<T> | Constraint<T>[],
  path: (string | number)[] = [],
): ConstraintViolation[] => {
  const violations: Recursive<ConstraintViolation>[] = []

  for (const c of arraify(constraints)) {
    if (c instanceof Collection) {
      if (isRecord(value as object)) {
        violations.push(Object.keys(c.constraints).reduce((violations, key) => {
          return [...violations, ...validate(value[key], c.constraints[key], [...path, key])]
        }, [] as ConstraintViolation[]))
      } else {
        violations.push(c.toViolation(value, path, 'unsupported'))
      }
      continue
    }

    if (c instanceof Exists) {
      if (typeof value === 'undefined') {
        violations.push(c.toViolation(value, path))
        break
      }
      continue
    }

    const validator = provider.get(c)
    if (!validator) {
      throw new Error('No validator for constraint ' + c.name)
    }

    const v = validator.validate(value, path)
    if (v) {
      violations.push(v)
    }
  }

  return flatten(violations)
}

export default validate