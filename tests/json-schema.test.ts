import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  custom,
  discriminatedUnion,
  each,
  exact,
  hasLength,
  isBoolean,
  isNumber,
  isString,
  meta,
  nullable,
  nullish,
  oneOf,
  optional,
  record,
  shape,
  tuple,
} from '@/index'
import {
  JsonSchemaExportError,
  toJsonSchema,
} from '@/json-schema'

describe('toJsonSchema', () => {
  test('exports built-in assertions, wrappers, allOf slots, structures and metadata', () => {
    const schema = meta(shape({
      email: meta(isString, {
        title: 'Email',
        format: 'email',
        widget: 'email',
      }),
      age: optional(isNumber),
      nickname: nullable(isString),
      bio: nullish(isString),
      role: exact('admin'),
      status: oneOf(['active', 'disabled']),
      password: [isString, hasLength({ min: 8 })],
      tags: each(isBoolean),
      preferences: record(isString),
      coords: tuple([isNumber, isNumber] as const),
    }).strict(), {
      title: 'Profile',
      description: 'Public profile payload',
    })

    expect(toJsonSchema(schema)).toEqual({
      type: 'object',
      title: 'Profile',
      description: 'Public profile payload',
      properties: {
        email: {
          type: 'string',
          title: 'Email',
          format: 'email',
        },
        age: {
          type: 'number',
        },
        nickname: {
          anyOf: [{
            type: 'string',
          }, {
            type: 'null',
          }],
        },
        bio: {
          anyOf: [{
            type: 'string',
          }, {
            type: 'null',
          }],
        },
        role: {
          const: 'admin',
        },
        status: {
          enum: ['active', 'disabled'],
        },
        password: {
          allOf: [{
            type: 'string',
          }, {
            anyOf: [{
              type: 'string',
              minLength: 8,
            }, {
              type: 'array',
              minItems: 8,
            }],
          }],
        },
        tags: {
          type: 'array',
          items: {
            type: 'boolean',
          },
        },
        preferences: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
        coords: {
          type: 'array',
          prefixItems: [{
            type: 'number',
          }, {
            type: 'number',
          }],
          minItems: 2,
          maxItems: 2,
        },
      },
      required: ['email', 'nickname', 'role', 'status', 'password', 'tags', 'preferences', 'coords'],
      additionalProperties: false,
    })
  })

  test('exports discriminated unions with explicit discriminator guards', () => {
    const schema = discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      team: shape({
        kind: exact('team'),
        size: isNumber,
      }).strict(),
    })

    expect(toJsonSchema(schema)).toEqual({
      oneOf: [{
        allOf: [{
          type: 'object',
          properties: {
            kind: {
              const: 'user',
            },
          },
          required: ['kind'],
        }, {
          type: 'object',
          properties: {
            kind: {
              const: 'user',
            },
            name: {
              type: 'string',
            },
          },
          required: ['kind', 'name'],
          additionalProperties: true,
        }],
      }, {
        allOf: [{
          type: 'object',
          properties: {
            kind: {
              const: 'team',
            },
          },
          required: ['kind'],
        }, {
          type: 'object',
          properties: {
            kind: {
              const: 'team',
            },
            size: {
              type: 'number',
            },
          },
          required: ['kind', 'size'],
          additionalProperties: false,
        }],
      }],
    })
  })

  test('drops unsupported nodes in best-effort mode and keeps schema-adjacent metadata', () => {
    const isoDate = meta(custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'stringFormat' as const,
          format: 'iso-date' as const,
        }
      },
    }), {
      title: 'Published at',
      format: 'date-time',
    })

    expect(toJsonSchema(shape({
      publishedAt: isoDate,
    }).fieldsMatch(['publishedAt', 'publishedAt']))).toEqual({
      type: 'object',
      properties: {
        publishedAt: {
          title: 'Published at',
          format: 'date-time',
        },
      },
      required: ['publishedAt'],
      additionalProperties: true,
      $comment: 'Dropped 1 object rule(s) during best-effort JSON Schema export.',
    })
  })

  test('throws in strict mode when a node has no faithful JSON Schema mapping', () => {
    const schema = shape({
      publishedAt: custom({
        check(value: unknown): value is string {
          return typeof value === 'string'
        },
        run() {
          return []
        },
      }),
    })

    expect(() => toJsonSchema(schema, { mode: 'strict' })).toThrowError(JsonSchemaExportError)
    expect(() => toJsonSchema(schema, { mode: 'strict' })).toThrowError(
      'Cannot export validator at publishedAt: custom validators need a supported public descriptor'
    )
  })
})
