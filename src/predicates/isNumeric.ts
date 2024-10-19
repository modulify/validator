import isNumber from '@/predicates/isNumber'
import isString from '@/predicates/isString'

/** Checks if a value is a number or a numeric string */
export default (value: unknown, integer = false): value is number | string => {
  const valid = (value: number) => {
    return !isNaN(value) && (!integer || Number.isInteger(value))
  }

  return (isNumber(value) || isString(value)) && valid(Number(value))
}
