import type {
  Intersect,
  Predicate,
} from '~types'

/** Checks if a value has a property */
export function hasProperty <K extends PropertyKey = PropertyKey>(key: K){
  return (value: unknown): value is { [k in K]: unknown } => {
    return isObject(value) && !isNull(value) && Object.prototype.hasOwnProperty.call(value, key)
  }
}

/** Checks if a value is an array */
export function isArray (value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/** Checks if a value is a boolean */
export function isBoolean (value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/** Checks if value is Date */
export function isDate (value: unknown): value is Date {
  return value instanceof Date
}

/** Checks if a value is an email */
export function isEmail (value: unknown): value is string {
  const pattern = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i

  return isString(value) && pattern.test(value)
}

/** Creates a predicate that checks if a value is equal to specified */
export function isExact <T = unknown>(exact: T){
  return (value: unknown): value is T => value === exact
}

/** Checks if value is null */
export function isNull (value: unknown): value is null {
  return value === null
}

/** Checks if a value is a number */
export function isNumber (value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/** Checks if a value is an object */
export function isObject (value: unknown): value is object {
  return typeof value === 'object'
}

/** Check if a value is a record like Record<PropertyKey, unknown> */
export function isRecord (value: unknown): value is Record<PropertyKey, unknown> {
  return isObject(value) && !isNull(value) && constructorOf(value) === Object && Object.keys(prototypeOf(value)).length === 0
}

/** Checks if a value is a string */
export function isString (value: unknown): value is string {
  return typeof value === 'string'
}

/** Checks if a value is a symbol */
export function isSymbol (value: unknown): value is symbol {
  return typeof value === 'symbol'
}

/** Checks if value is undefined */
export function isUndefined (value: unknown): value is undefined {
  return typeof value === 'undefined'
}

function constructorOf(value: object): unknown {
  return prototypeOf(value).constructor
}

function prototypeOf (value: object) {
  return Object.getPrototypeOf(value)
}

export function And<T extends unknown[]>(
  ...predicates: [...{ [K in keyof T]: Predicate<T[K]> }]
): Predicate<Intersect<T>> {
  return (value: unknown): value is Intersect<T> => {
    return predicates.every(predicate => predicate(value))
  }
}

export function Or<T extends unknown[]>(
  ...predicates: [...{ [K in keyof T]: Predicate<T[K]> }]
): Predicate<T[number]> {
  return (value: unknown): value is T[number] => {
    return predicates.some(predicate => predicate(value))
  }
}

export function Not<T> (predicate: Predicate<T>): Predicate {
  return (value: unknown): value is unknown => {
    return !predicate(value)
  }
}
