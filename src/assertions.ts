import type { AssertionConstraint } from '~types'

import { assert } from './assert'

import {
  inRange,
  isEqual,
  isGte,
  isLte,
} from '@/checkers'
import { length } from '@/extractors'
import {
  isArray,
  isBoolean as _isBoolean,
  isDate as _isDate,
  isEmail as _isEmail,
  isNull as _isNull,
  isNumber as _isNumber,
  isString as _isString,
  isSymbol as _isSymbol,
} from '@/predicates'

export { assert }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Defined = {} | null

export const isBoolean = assert(_isBoolean, { name: 'isBoolean', bail: true })
export const isDate = assert(_isDate, { name: 'isDate', bail: true })
export const isDefined = assert((value: unknown): value is Defined => value !== undefined, {
  name: 'isDefined',
  bail: true,
  rule: 'undefined',
})
export const isEmail = assert(_isEmail, { name: 'isEmail', bail: true })
export const isNull = assert(_isNull, { name: 'isNull', bail: true })
export const isNumber = assert(_isNumber, { name: 'isNumber', bail: true })
export const isString = assert(_isString, { name: 'isString', bail: true })
export const isSymbol = assert(_isSymbol, { name: 'isSymbol', bail: true })

export const hasLength = ({
  exact = null,
  max = null,
  min = null,
  range = null,
  bail = false,
}: {
  exact?: number | null;
  max?: number | null;
  min?: number | null;
  range?: [number, number] | null;
  bail?: boolean;
} = {}) => {
  const constraints: AssertionConstraint<string | unknown[]>[] = []

  if (exact !== null) constraints.push([length, isEqual, 'exact', exact])
  if (max !== null) constraints.push([length, isLte, 'max', max])
  if (min !== null) constraints.push([length, isGte, 'min', min])
  if (range !== null) constraints.push([length, inRange, 'range', range])

  return assert(
    (value: unknown): value is string | unknown[] => isArray(value) || _isString(value),
    {
      name: 'hasLength',
      bail,
      rule: 'unsupported',
    },
    constraints
  )
}

export const oneOf = <Actual = unknown>(
  values: Actual[] | Record<string, Actual>,
  {
    equalTo = (a: Actual, b: unknown) => a === b,
    bail = false,
  }: {
    equalTo?: (a: Actual, b: unknown) => boolean;
    bail?: boolean;
  } = {}
) => {
  const haystack = isArray(values) ? values : Object.values(values)

  return assert((value: unknown): value is Actual => haystack.some(item => equalTo(item, value)), {
    name: 'oneOf',
    bail,
    args: [haystack],
  })
}
