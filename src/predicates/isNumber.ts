/** Checks if a value is a number */
export default (value: unknown): value is number => typeof value === 'number'
