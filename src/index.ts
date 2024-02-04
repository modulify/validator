import type {
  Constraint,
  ConstraintViolation,
  Key,
  Provider,
  Recursive,
  Validator,
} from '../types'

import Collection from '@/constraints/Collection'
import Exists from '@/constraints/Exists'
import Length from '@/constraints/Length'
import OneOf from '@/constraints/OneOf'

import ProviderChain from '@/provider'

import {
  arraify,
  flatten,
  isRecord,
} from '@/utils'

const validate = <Value>(
  provider: Provider,
  value: Value,
  constraints: Constraint<Value> | Constraint<Value>[],
  path: Key[] = []
): ConstraintViolation[] => {
  const violations: Recursive<ConstraintViolation>[] = []

  for (const c of arraify(constraints)) {
    if (c instanceof Collection) {
      if (isRecord(value as object)) {
        violations.push(Object.keys(c.constraints).reduce((violations, key) => {
          return [...violations, ...validate(provider, value[key], c.constraints[key], [...path, key])]
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

  return flatten(violations) as ConstraintViolation[]
}

class V implements Validator {
  private readonly _provider: Provider

  constructor (provider: Provider | null = null) {
    this._provider = provider ?? new ProviderChain()
  }

  override (provider: Provider) {
    return new V(this._provider.override(provider))
  }

  validate<Value>(
    value: Value,
    constraints: Constraint<Value> | Constraint<Value>[]
  ): ConstraintViolation[] {
    return validate(this._provider, value, constraints)
  }
}

const createValidator = (
  provider: Provider | null = null
): Validator => new V(provider)

export {
  Collection,
  Exists,
  Length,
  OneOf,
  ProviderChain,
  createValidator,
  validate,
}