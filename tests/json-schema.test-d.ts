import type {
  JsonSchema,
} from '@/json-schema'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import {
  describe as describeConstraint,
  isString,
  shape,
} from '@/index'
import {
  JsonSchemaExportError,
  toJsonSchema,
} from '@/json-schema'

describe('json schema export types', () => {
  test('returns the public JsonSchema type and exposes the export error shape', () => {
    const schema = toJsonSchema(shape({
      name: isString,
    }))

    assertType<JsonSchema>(schema)

    const error = new JsonSchemaExportError('Unsupported', {
      descriptor: describeConstraint(isString),
      reason: 'reason',
      path: ['name'],
    })

    assertType<readonly PropertyKey[]>(error.path)
  })
})
