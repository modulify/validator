import { Assert } from '@/assertions/Assert'

import {
  isArray,
  isExact,
  isNumber,
  isString,
  Or,
} from '@/predicates'

const isGTE = (min: number) => (x: unknown): x is number => isNumber(x) && x >= min
const isLTE = (max: number) => (x: unknown): x is number => isNumber(x) && x <= max

const IsEqual = (exact: number) => Assert((x: string | unknown[]): x is string | unknown[] => isExact(exact)(x.length), {
  fqn: '@modulify/validator/HasLength[exact]',
  bail: false,
  reason: 'exact',
  meta: exact,
})

const IsGTE = (min: number) => Assert((x: string | unknown[]): x is string | unknown[] => isGTE(min)(x.length), {
  fqn: '@modulify/validator/HasLength[min]',
  bail: false,
  reason: 'min',
  meta: min,
})

const IsLTE = (max: number) => Assert((x: string | unknown[]): x is string | unknown[] => isLTE(max)(x.length), {
  fqn: '@modulify/validator/HasLength[max]',
  bail: false,
  reason: 'max',
  meta: max,
})

export const HasLength = ({
  exact = null,
  max = null,
  min = null,
  bail = false,
}: {
  exact?: number | null
  max?: number | null
  min?: number | null
  bail?: boolean
}) => Assert(Or(isString, isArray), {
  fqn: '@modulify/validator/HasLength',
  bail,
  reason: 'unsupported',
}).That(
  ...(exact !== null ? [IsEqual(exact)] : []),
  ...(max !== null ? [IsLTE(max)] : []),
  ...(min !== null ? [IsGTE(min)] : [])
)
