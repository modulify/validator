import type {
  Constraint,
  ConstraintViolation,
  Recursive,
} from '../types'

import Collection from '@/constraints/Collection'
import Exists from '@/constraints/Exists'

import {
  arraify,
  flatten,
} from '@/utils'

import provider from '@/provider'

const constructorOf = (value: object): unknown => {
  return Object.getPrototypeOf(value).constructor
}

const isRecord = (value: object): boolean => {
  return constructorOf(value) === Object && Object.keys(Object.getPrototypeOf(value)).length === 0
}

const validate = <T>(
  value: T,
  constraints: Constraint<T> | Constraint<T>[],
  path: (string | number)[] = []
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