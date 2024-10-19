import isNull from './isNull'
import isObject from './isObject'

/** Checks if a value has a property */
export default (value: unknown, key: PropertyKey): boolean => {
  return isObject(value) && !isNull(value) && Object.prototype.hasOwnProperty.call(value, key)
}
