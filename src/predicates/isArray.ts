/** Checks if a value is an array */
export default (value: unknown): value is unknown[] => Array.isArray(value)
