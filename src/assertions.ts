import type { AssertionConstraint } from '~types'

import {
  assert,
  createRefinement,
  refine,
} from './assert'

import {
  endsWith as _endsWith,
  inRange,
  isEqual,
  isGte,
  isLte,
  isMultipleOf,
  matchesPattern,
  startsWith as _startsWith,
} from '@/checkers'
import {
  length,
  size,
} from '@/extractors'
import {
  isArray,
  isBoolean as _isBoolean,
  isBigInt as _isBigInt,
  isBlob as _isBlob,
  isDate as _isDate,
  isEmail as _isEmail,
  isError as _isError,
  isFiniteNumber as _isFiniteNumber,
  isFile as _isFile,
  isFunction as _isFunction,
  isInteger as _isInteger,
  isMap as _isMap,
  isNaN as _isNaN,
  isNull as _isNull,
  isNumber as _isNumber,
  isPromiseLike as _isPromiseLike,
  isRegExp as _isRegExp,
  isSafeInteger as _isSafeInteger,
  isSet as _isSet,
  isString as _isString,
  isSymbol as _isSymbol,
  isValidDate as _isValidDate,
} from '@/predicates'

export {
  assert,
  refine,
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Defined = {} | null
type EmptyOptions = Record<never, never>

type LengthExactConstraint<N extends number = number> =
  AssertionConstraint<string | unknown[], number, [exact: N], 'length.exact'>
type LengthMaxConstraint<N extends number = number> =
  AssertionConstraint<string | unknown[], number, [max: N], 'length.max'>
type LengthMinConstraint<N extends number = number> =
  AssertionConstraint<string | unknown[], number, [min: N], 'length.min'>
type LengthRangeConstraint<R extends readonly [number, number] = readonly [number, number]> =
  AssertionConstraint<string | unknown[], number, [range: R], 'length.range'>
type LengthAssertionConstraint =
  | LengthExactConstraint
  | LengthMaxConstraint
  | LengthMinConstraint
  | LengthRangeConstraint

type SizeExactConstraint<N extends number = number> =
  AssertionConstraint<Map<unknown, unknown> | Set<unknown>, number, [exact: N], 'size.exact'>
type SizeMaxConstraint<N extends number = number> =
  AssertionConstraint<Map<unknown, unknown> | Set<unknown>, number, [max: N], 'size.max'>
type SizeMinConstraint<N extends number = number> =
  AssertionConstraint<Map<unknown, unknown> | Set<unknown>, number, [min: N], 'size.min'>
type SizeRangeConstraint<R extends readonly [number, number] = readonly [number, number]> =
  AssertionConstraint<Map<unknown, unknown> | Set<unknown>, number, [range: R], 'size.range'>
type SizeAssertionConstraint =
  | SizeExactConstraint
  | SizeMaxConstraint
  | SizeMinConstraint
  | SizeRangeConstraint

type ValueExactConstraint<N extends number = number> =
  AssertionConstraint<number, number, [exact: N], 'number.exact'>
type ValueMaxConstraint<N extends number = number> =
  AssertionConstraint<number, number, [max: N], 'number.max'>
type ValueMinConstraint<N extends number = number> =
  AssertionConstraint<number, number, [min: N], 'number.min'>
type ValueRangeConstraint<R extends readonly [number, number] = readonly [number, number]> =
  AssertionConstraint<number, number, [range: R], 'number.range'>
type ValueAssertionConstraint =
  | ValueExactConstraint
  | ValueMaxConstraint
  | ValueMinConstraint
  | ValueRangeConstraint

type BoundedAssertionOptions = {
  exact?: number | null;
  max?: number | null;
  min?: number | null;
  range?: readonly [number, number] | null;
  bail?: boolean;
}

type OptionNumber<O, K extends PropertyKey> = K extends keyof O ? Extract<O[K], number> : never

type OptionRange<O, K extends PropertyKey> =
  K extends keyof O
    ? Extract<O[K], readonly [number, number] | [number, number]> extends infer R
      ? R extends readonly [infer Min extends number, infer Max extends number]
        ? readonly [Min, Max]
        : never
      : never
    : never

type IncludeConstraint<
  Value,
  C extends AssertionConstraint,
> = [Value] extends [never] ? [] : [C]

type LengthConstraintTupleFromOptions<O> = [
  ...IncludeConstraint<OptionNumber<O, 'exact'>, LengthExactConstraint<OptionNumber<O, 'exact'>>>,
  ...IncludeConstraint<OptionNumber<O, 'max'>, LengthMaxConstraint<OptionNumber<O, 'max'>>>,
  ...IncludeConstraint<OptionNumber<O, 'min'>, LengthMinConstraint<OptionNumber<O, 'min'>>>,
  ...IncludeConstraint<OptionRange<O, 'range'>, LengthRangeConstraint<OptionRange<O, 'range'>>>,
]

type SizeConstraintTupleFromOptions<O> = [
  ...IncludeConstraint<OptionNumber<O, 'exact'>, SizeExactConstraint<OptionNumber<O, 'exact'>>>,
  ...IncludeConstraint<OptionNumber<O, 'max'>, SizeMaxConstraint<OptionNumber<O, 'max'>>>,
  ...IncludeConstraint<OptionNumber<O, 'min'>, SizeMinConstraint<OptionNumber<O, 'min'>>>,
  ...IncludeConstraint<OptionRange<O, 'range'>, SizeRangeConstraint<OptionRange<O, 'range'>>>,
]

type ValueConstraintTupleFromOptions<O> = [
  ...IncludeConstraint<OptionNumber<O, 'exact'>, ValueExactConstraint<OptionNumber<O, 'exact'>>>,
  ...IncludeConstraint<OptionNumber<O, 'max'>, ValueMaxConstraint<OptionNumber<O, 'max'>>>,
  ...IncludeConstraint<OptionNumber<O, 'min'>, ValueMinConstraint<OptionNumber<O, 'min'>>>,
  ...IncludeConstraint<OptionRange<O, 'range'>, ValueRangeConstraint<OptionRange<O, 'range'>>>,
]

const buildLengthConstraints = <const O extends BoundedAssertionOptions>(options: O): LengthConstraintTupleFromOptions<O> => {
  const {
    exact = null,
    max = null,
    min = null,
    range = null,
  } = options
  const constraints: LengthAssertionConstraint[] = []

  if (exact !== null) constraints.push([length, isEqual, 'length.exact', exact] as const)
  if (max !== null) constraints.push([length, isLte, 'length.max', max] as const)
  if (min !== null) constraints.push([length, isGte, 'length.min', min] as const)
  if (range !== null) constraints.push([length, inRange, 'length.range', range] as const)

  return constraints as unknown as LengthConstraintTupleFromOptions<O>
}

const buildSizeConstraints = <const O extends BoundedAssertionOptions>(options: O): SizeConstraintTupleFromOptions<O> => {
  const {
    exact = null,
    max = null,
    min = null,
    range = null,
  } = options
  const constraints: SizeAssertionConstraint[] = []

  if (exact !== null) constraints.push([size, isEqual, 'size.exact', exact] as const)
  if (max !== null) constraints.push([size, isLte, 'size.max', max] as const)
  if (min !== null) constraints.push([size, isGte, 'size.min', min] as const)
  if (range !== null) constraints.push([size, inRange, 'size.range', range] as const)

  return constraints as unknown as SizeConstraintTupleFromOptions<O>
}

const buildValueConstraints = <const O extends BoundedAssertionOptions>(options: O): ValueConstraintTupleFromOptions<O> => {
  const {
    exact = null,
    max = null,
    min = null,
    range = null,
  } = options
  const constraints: ValueAssertionConstraint[] = []

  if (exact !== null) constraints.push([(value: number) => value, isEqual, 'number.exact', exact] as const)
  if (max !== null) constraints.push([(value: number) => value, isLte, 'number.max', max] as const)
  if (min !== null) constraints.push([(value: number) => value, isGte, 'number.min', min] as const)
  if (range !== null) constraints.push([(value: number) => value, inRange, 'number.range', range] as const)

  return constraints as unknown as ValueConstraintTupleFromOptions<O>
}

export const isBoolean = /* @__PURE__ */ assert(_isBoolean, { name: 'isBoolean', bail: true, code: 'type.boolean' })
export const isBigInt = /* @__PURE__ */ assert(_isBigInt, { name: 'isBigInt', bail: true, code: 'type.bigint' })
export const isBlob = /* @__PURE__ */ assert(_isBlob, { name: 'isBlob', bail: true, code: 'type.blob' })
export const isDate = /* @__PURE__ */ assert(_isDate, { name: 'isDate', bail: true, code: 'type.date' })
export const isDefined = /* @__PURE__ */ assert((value: unknown): value is Defined => value !== undefined, {
  name: 'isDefined',
  bail: true,
  code: 'value.defined',
})
export const isEmail = /* @__PURE__ */ assert(_isEmail, { name: 'isEmail', bail: true, code: 'string.email' })
export const isError = /* @__PURE__ */ assert(_isError, { name: 'isError', bail: true, code: 'type.error' })
export const isFiniteNumber = /* @__PURE__ */ assert(_isFiniteNumber, {
  name: 'isFiniteNumber',
  bail: true,
  code: 'number.finite',
})
export const isFile = /* @__PURE__ */ assert(_isFile, { name: 'isFile', bail: true, code: 'type.file' })
export const isFunction = /* @__PURE__ */ assert(_isFunction, { name: 'isFunction', bail: true, code: 'type.function' })
export const isInteger = /* @__PURE__ */ assert(_isInteger, { name: 'isInteger', bail: true, code: 'number.integer' })
export const isMap = /* @__PURE__ */ assert(_isMap, { name: 'isMap', bail: true, code: 'type.map' })
export const isNaN = /* @__PURE__ */ assert(_isNaN, { name: 'isNaN', bail: true, code: 'number.nan' })
export const isNull = /* @__PURE__ */ assert(_isNull, { name: 'isNull', bail: true, code: 'type.null' })
export const isNumber = /* @__PURE__ */ assert(_isNumber, { name: 'isNumber', bail: true, code: 'type.number' })
export const isPromiseLike = /* @__PURE__ */ assert(_isPromiseLike, {
  name: 'isPromiseLike',
  bail: true,
  code: 'type.promise-like',
})
export const isRegExp = /* @__PURE__ */ assert(_isRegExp, { name: 'isRegExp', bail: true, code: 'type.regexp' })
export const isSafeInteger = /* @__PURE__ */ assert(_isSafeInteger, {
  name: 'isSafeInteger',
  bail: true,
  code: 'number.safe-integer',
})
export const isSet = /* @__PURE__ */ assert(_isSet, { name: 'isSet', bail: true, code: 'type.set' })
export const isString = /* @__PURE__ */ assert(_isString, { name: 'isString', bail: true, code: 'type.string' })
export const isSymbol = /* @__PURE__ */ assert(_isSymbol, { name: 'isSymbol', bail: true, code: 'type.symbol' })
export const isValidDate = /* @__PURE__ */ assert(_isValidDate, {
  name: 'isValidDate',
  bail: true,
  code: 'date.valid',
})

export const hasLength = <const O extends BoundedAssertionOptions = EmptyOptions>(
  options: O = {} as O
) => {
  const { bail = false } = options
  const constraints = buildLengthConstraints(options)

  return /* @__PURE__ */ createRefinement(
    {
      name: 'hasLength',
      bail,
      code: 'length.unsupported-type',
    },
    constraints
  )
}

export const hasSize = <const O extends BoundedAssertionOptions = EmptyOptions>(
  options: O = {} as O
) => {
  const { bail = false } = options
  const constraints = buildSizeConstraints(options)

  return /* @__PURE__ */ createRefinement(
    {
      name: 'hasSize',
      bail,
      code: 'size.unsupported-type',
    },
    constraints
  )
}

export const hasPattern = (
  pattern: RegExp,
  {
    bail = false,
  }: {
    bail?: boolean;
  } = {}
) => /* @__PURE__ */ createRefinement(
  {
    name: 'hasPattern',
    bail,
    code: 'string.unsupported-type',
  },
  [[
    (value: string) => value,
    matchesPattern,
    'string.pattern',
    pattern,
  ]] as const
)

export const startsWith = (
  prefix: string,
  {
    bail = false,
  }: {
    bail?: boolean;
  } = {}
) => /* @__PURE__ */ createRefinement(
  {
    name: 'startsWith',
    bail,
    code: 'string.unsupported-type',
  },
  [[
    (value: string) => value,
    _startsWith,
    'string.starts-with',
    prefix,
  ]] as const
)

export const endsWith = (
  suffix: string,
  {
    bail = false,
  }: {
    bail?: boolean;
  } = {}
) => /* @__PURE__ */ createRefinement(
  {
    name: 'endsWith',
    bail,
    code: 'string.unsupported-type',
  },
  [[
    (value: string) => value,
    _endsWith,
    'string.ends-with',
    suffix,
  ]] as const
)

export const hasValue = <const O extends BoundedAssertionOptions = EmptyOptions>(
  options: O = {} as O
) => {
  const { bail = false } = options
  const constraints = buildValueConstraints(options)

  return /* @__PURE__ */ createRefinement(
    {
      name: 'hasValue',
      bail,
      code: 'number.unsupported-type',
    },
    constraints
  )
}

export const multipleOf = <const Step extends number>(
  step: Step,
  {
    bail = false,
  }: {
    bail?: boolean;
  } = {}
) => /* @__PURE__ */ createRefinement(
  {
    name: 'multipleOf',
    bail,
    code: 'number.unsupported-type',
  },
  [[
    (value: number) => value,
    isMultipleOf,
    'number.multiple-of',
    step,
  ]] as const
)

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

  return /* @__PURE__ */ assert((value: unknown): value is Actual => haystack.some(item => equalTo(item, value)), {
    name: 'oneOf',
    bail,
    code: 'value.one-of',
    args: [haystack],
  })
}
