import type {
  Constraint,
  ConstraintViolation,
  Key,
  Provider,
  Recursive,
  Validator,
} from '../types'

import Collection from '@/constraints/Collection'
import Each from '@/constraints/Each'
import Exists from '@/constraints/Exists'
import Length from '@/constraints/Length'
import OneOf from '@/constraints/OneOf'

import ProviderChain from '@/provider'

import {
  arraify,
  flatten,
  isRecord,
} from '@/utils'

const validateAsynchronously = async <Value> (
  provider: Provider,
  value: Value,
  constraints: Constraint<Value> | Constraint<Value>[],
  path: Key[] = []
): Promise<ConstraintViolation[]> => {
  const validations: Promise<ConstraintViolation[]>[] = []

  for (const c of arraify(constraints)) {
    if (c instanceof Collection) {
      if (isRecord(value as object)) {
        validations.push(...c.reduce((validations, constraints, key) => {
          return [...validations, validateAsynchronously(provider, value[key], constraints, [...path, key])]
        }, [] as Promise<ConstraintViolation[]>[]))
      } else {
        validations.push(Promise.resolve([c.toViolation(value, path, 'unsupported')]))
      }
      continue
    }

    if (c instanceof Each) {
      if (Array.isArray(value)) {
        value.forEach((value, index) => {
          validations.push(validateAsynchronously(provider, value, c.constraints, [...path, index]))
        })
      } else {
        validations.push(validateAsynchronously(provider, value, c.constraints, [...path]))
      }
      continue
    }

    if (c instanceof Exists) {
      if (typeof value === 'undefined') {
        validations.push(Promise.resolve([c.toViolation(value, [...path])]))
        break
      }
      continue
    }

    const validator = provider.get(c)
    if (!validator) {
      throw new Error('No validator for constraint ' + c.name)
    }

    const v = validator.validate(value, [...path])
    if (v) {
      if (v instanceof Promise) {
        validations.push(v.then(v => v ? [v] : []))
      } else {
        validations.push(Promise.resolve([v]))
      }
    }
  }

  const results = await Promise.allSettled(validations)
  const violations: ConstraintViolation[] = []

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      violations.push(...result.value)
    }
  })

  return violations
}

const validateSynchronously = <Value>(
  provider: Provider,
  value: Value,
  constraints: Constraint<Value> | Constraint<Value>[],
  path: Key[] = []
): ConstraintViolation[] => {
  const violations: Recursive<ConstraintViolation>[] = []

  for (const c of arraify(constraints)) {
    if (c instanceof Collection) {
      if (isRecord(value as object)) {
        violations.push(c.reduce((violations, constraints, key) => {
          return [...violations, ...validateSynchronously(provider, value[key], constraints, [...path, key])]
        }, [] as ConstraintViolation[]))
      } else {
        violations.push(c.toViolation(value, path, 'unsupported'))
      }
      continue
    }

    if (c instanceof Each) {
      if (Array.isArray(value)) {
        value.forEach((value, index) => {
          violations.push(...validateSynchronously(provider, value, c.constraints, [...path, index]))
        })
      } else {
        violations.push(...validateSynchronously(provider, value, c.constraints, [...path]))
      }
      continue
    }

    if (c instanceof Exists) {
      if (typeof value === 'undefined') {
        violations.push(c.toViolation(value, [...path]))
        break
      }
      continue
    }

    const validator = provider.get(c)
    if (!validator) {
      throw new Error('No validator for constraint ' + c.name)
    }

    const v = validator.validate(value, [...path])
    if (v) {
      if (v instanceof Promise) {
        throw new Error('Found asynchronous validator for constraint ' + c.name)
      }
      violations.push(v)
    }
  }

  return flatten(violations) as ConstraintViolation[]
}

type MaybePromise<Value, Asynchronously extends boolean = true> = Asynchronously extends true ? Promise<Value> : Value

const validate = <Value, Asynchronously extends boolean = true>(
  provider: Provider,
  value: Value,
  constraints: Constraint<Value> | Constraint<Value>[],
  path: Key[] = [],
  asynchronously: Asynchronously = true as Asynchronously
): MaybePromise<ConstraintViolation[], Asynchronously> => {
  return asynchronously
    ? validateAsynchronously(provider, value, constraints, path) as MaybePromise<ConstraintViolation[], Asynchronously>
    : validateSynchronously(provider, value, constraints, path) as MaybePromise<ConstraintViolation[], Asynchronously>
}

class V implements Validator {
  private readonly _provider: Provider

  constructor (provider: Provider | null = null) {
    this._provider = provider ?? new ProviderChain()
  }

  override (provider: Provider) {
    return new V(this._provider.override(provider))
  }

  validate<Value, Asynchronously extends boolean = true>(
    value: Value,
    constraints: Constraint<Value> | Constraint<Value>[],
    asynchronously: Asynchronously = true as Asynchronously
  ): MaybePromise<ConstraintViolation[], Asynchronously> {
    return validate(
      this._provider,
      value,
      constraints,
      [],
      asynchronously
    )
  }
}

const createValidator = (
  provider: Provider | null = null
): Validator => new V(provider)

export {
  Collection,
  Each,
  Exists,
  Length,
  OneOf,
  ProviderChain,
  createValidator,
  validate,
}