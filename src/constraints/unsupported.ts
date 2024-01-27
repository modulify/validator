import type { ConstraintViolation } from '../../types'

export default <T>(value: T, path: (string | number)[] = []): ConstraintViolation<T> => ({
  value,
  path,
  reason: 'unsupported'
})