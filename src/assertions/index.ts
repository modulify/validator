import { Assert } from './Assert'

import {
  isArray,
  isBoolean,
  isDate,
  isEmail,
  isNull,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
  Not,
} from '@/predicates'

export { Assert }

export { HasLength } from './HasLength'

export const IsBoolean = Assert(isBoolean, {
  fqn: '@modulify/validator/IsBoolean',
  bail: true,
})

export const IsDate = Assert(isDate, {
  fqn: '@modulify/validator/IsDate',
  bail: true,
})

export const IsDefined = Assert(Not(isUndefined), {
  fqn: '@modulify/validator/IsDefined',
  bail: true,
  reason: 'undefined',
})

export const IsEmail = Assert(isEmail, {
  fqn: '@modulify/validator/IsEmail',
  bail: true,
})

export const IsNull = Assert(isNull, {
  fqn: '@modulify/validator/IsNull',
  bail: true,
})

export const IsNumber = Assert(isNumber, {
  fqn: '@modulify/validator/IsNumber',
  bail: true,
})

export const IsString = Assert(isString, {
  fqn: '@modulify/validator/IsString',
  bail: true,
})

export const IsSymbol = Assert(isSymbol, {
  fqn: '@modulify/validator/IsSymbol',
  bail: true,
})

export const OneOf = <Actual = unknown>(
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

  const oneOf = (value: unknown): value is Actual => haystack.some(allowed => equalTo(allowed, value))

  return Assert(oneOf, {
    fqn: '@modulify/validator/OneOf',
    bail,
    meta: haystack,
  })
}
