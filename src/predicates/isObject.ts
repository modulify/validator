/** Checks if a value is an object */
export default (value: unknown): value is object => typeof value === 'object'
