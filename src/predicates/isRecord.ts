import isNull from './isNull'
import isObject from './isObject'

const prototypeOf = (value: object) => Object.getPrototypeOf(value)
const constructorOf = (value: object): unknown => {
  return prototypeOf(value).constructor
}

/** Check if a value is a record like Record<PropertyKey, unknown> */
export default (value: unknown): value is Record<PropertyKey, unknown> => {
  return isObject(value) && !isNull(value) && constructorOf(value) === Object && Object.keys(prototypeOf(value)).length === 0
}
