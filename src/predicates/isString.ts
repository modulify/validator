/** Checks if a value is a string */
export default (value: unknown): value is string => typeof value === 'string'
