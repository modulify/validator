import isString from '@/predicates/isString'

const pattern = /^(([^<>()\[\].,;:\s@"]+(\.[^<>()\[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i

/** Checks if a value is an email */
export default (value: unknown): value is string => isString(value) && pattern.test(value)
