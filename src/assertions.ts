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
  isBigInt as _isBigInt,
  isBlob as _isBlob,
  isDate as _isDate,
  isEmail as _isEmail,
  isFile as _isFile,
  isFunction as _isFunction,
  isMap as _isMap,
  isNaN as _isNaN,
  isNull as _isNull,
  isNumber as _isNumber,
  isSet as _isSet,
  isString as _isString,
  isSymbol as _isSymbol,
} from '@/predicates'

export { assert }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Defined = {} | null

export const isBoolean = assert(_isBoolean, { name: 'isBoolean', bail: true, code: 'type.boolean' })
export const isBigInt = assert(_isBigInt, { name: 'isBigInt', bail: true, code: 'type.bigint' })
export const isBlob = assert(_isBlob, { name: 'isBlob', bail: true, code: 'type.blob' })
export const isDate = assert(_isDate, { name: 'isDate', bail: true, code: 'type.date' })
export const isDefined = assert((value: unknown): value is Defined => value !== undefined, {
  name: 'isDefined',
  bail: true,
  code: 'value.defined',
})
export const isEmail = assert(_isEmail, { name: 'isEmail', bail: true, code: 'string.email' })
export const isFile = assert(_isFile, { name: 'isFile', bail: true, code: 'type.file' })
export const isFunction = assert(_isFunction, { name: 'isFunction', bail: true, code: 'type.function' })
export const isMap = assert(_isMap, { name: 'isMap', bail: true, code: 'type.map' })
export const isNaN = assert(_isNaN, { name: 'isNaN', bail: true, code: 'number.nan' })
export const isNull = assert(_isNull, { name: 'isNull', bail: true, code: 'type.null' })
export const isNumber = assert(_isNumber, { name: 'isNumber', bail: true, code: 'type.number' })
export const isSet = assert(_isSet, { name: 'isSet', bail: true, code: 'type.set' })
export const isString = assert(_isString, { name: 'isString', bail: true, code: 'type.string' })
export const isSymbol = assert(_isSymbol, { name: 'isSymbol', bail: true, code: 'type.symbol' })

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

  if (exact !== null) constraints.push([length, isEqual, 'length.exact', exact])
  if (max !== null) constraints.push([length, isLte, 'length.max', max])
  if (min !== null) constraints.push([length, isGte, 'length.min', min])
  if (range !== null) constraints.push([length, inRange, 'length.range', range])

  return assert(
    (value: unknown): value is string | unknown[] => isArray(value) || _isString(value),
    {
      name: 'hasLength',
      bail,
      code: 'length.unsupported-type',
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
    code: 'value.one-of',
    args: [haystack],
  })
}
