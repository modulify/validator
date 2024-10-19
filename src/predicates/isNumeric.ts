import isNumber from '@/predicates/isNumber'
import isString from '@/predicates/isString'

/** Checks if a value is a number or a numeric string */
export default (value: unknown, integer = false): value is number | string => {
  return isNumber(value) || isString(value) && !isNaN(integer ? parseInt(value) : parseFloat(value))
}
