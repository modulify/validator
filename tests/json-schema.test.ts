import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  assert,
  custom,
  discriminatedUnion,
  each,
  endsWith,
  exact,
  hasLength,
  hasPattern,
  hasSize,
  hasValue,
  isBoolean,
  isBigInt,
  isBlob,
  isDate,
  isDefined,
  isEmail,
  isFile,
  isFunction,
  isMap,
  isNaN,
  isNull,
  isNumber,
  isSet,
  isString,
  isSymbol,
  meta,
  multipleOf,
  nullable,
  nullish,
  oneOf,
  optional,
  record,
  shape,
  startsWith,
  tuple,
  union,
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

  test.each([
    [isBigInt, 'bigint values cannot be represented in JSON Schema'],
    [isBlob, 'Blob instances do not have a stable JSON Schema representation'],
    [isFile, 'File instances do not have a stable JSON Schema representation'],
    [isFunction, 'functions cannot be represented in JSON Schema'],
    [isMap, 'Map instances do not have a stable JSON Schema representation'],
    [isNaN, 'NaN cannot be represented in JSON Schema'],
    [isSet, 'Set instances do not have a stable JSON Schema representation'],
    [hasSize({ min: 1 }), 'Map and Set sizes do not have a stable JSON Schema representation'],
  ] as const)('throws in strict mode for unsupported built-in assertion %s', (assertion, reason) => {
    expect(() => toJsonSchema(shape({
      value: assertion,
    }), { mode: 'strict' })).toThrowError(
      `Cannot export assertion at value: ${reason}`
    )
  })

  test('exports remaining supported assertion variants, metadata primitives and optionality inference', () => {
    const hidden = Symbol('hidden')

    expect(toJsonSchema(shape({
      email: meta(isEmail, {
        description: 'Contact address',
        format: 'uri',
        default: 'user@example.com',
        examples: ['user@example.com'],
        deprecated: true,
        readOnly: false,
        writeOnly: true,
      }),
      literalNumber: exact(1),
      enumNumbers: oneOf([1, 2, 2]),
      nullValue: isNull,
      passthrough: isDefined,
      nullableEmpty: nullable(isDefined),
      optionalUnion: union([exact(undefined), isString]),
      optionalAllOf: [optional(isString), exact(undefined)],
      optionalEnum: oneOf([undefined, 'draft']),
      exactLength: hasLength({ exact: 3 }),
      maxLength: hasLength({ max: 5 }),
      rangeLength: hasLength({ range: [1, 3] }),
      valueExact: hasValue({ exact: 3 }),
      valueMin: hasValue({ min: 1 }),
      valueMax: hasValue({ max: 10 }),
      valueRange: hasValue({ range: [1, 10] }),
      valueMultipleOf: multipleOf(5),
      textPattern: hasPattern(/^[a-z]+$/),
      textPrefix: startsWith('pre'),
      textSuffix: endsWith('.ts'),
      [hidden]: isString,
    }))).toEqual({
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Contact address',
          default: 'user@example.com',
          examples: ['user@example.com'],
          deprecated: true,
          readOnly: false,
          writeOnly: true,
        },
        literalNumber: {
          const: 1,
        },
        enumNumbers: {
          enum: [1, 2],
        },
        nullValue: {
          type: 'null',
        },
        passthrough: {},
        nullableEmpty: {},
        optionalUnion: {
          anyOf: [{}, { type: 'string' }],
        },
        optionalAllOf: {
          allOf: [{ type: 'string' }, {}],
        },
        optionalEnum: {},
        exactLength: {
          anyOf: [{
            type: 'string',
            minLength: 3,
            maxLength: 3,
          }, {
            type: 'array',
            minItems: 3,
            maxItems: 3,
          }],
        },
        maxLength: {
          anyOf: [{
            type: 'string',
            maxLength: 5,
          }, {
            type: 'array',
            maxItems: 5,
          }],
        },
        rangeLength: {
          anyOf: [{
            type: 'string',
            minLength: 1,
            maxLength: 3,
          }, {
            type: 'array',
            minItems: 1,
            maxItems: 3,
          }],
        },
        valueExact: {
          type: 'number',
          const: 3,
        },
        valueMin: {
          type: 'number',
          minimum: 1,
        },
        valueMax: {
          type: 'number',
          maximum: 10,
        },
        valueRange: {
          type: 'number',
          minimum: 1,
          maximum: 10,
        },
        valueMultipleOf: {
          type: 'number',
          multipleOf: 5,
        },
        textPattern: {
          type: 'string',
          pattern: '^[a-z]+$',
        },
        textPrefix: {
          type: 'string',
          pattern: '^pre',
        },
        textSuffix: {
          type: 'string',
          pattern: '\\.ts$',
        },
      },
      required: [
        'email',
        'literalNumber',
        'enumNumbers',
        'nullValue',
        'passthrough',
        'nullableEmpty',
        'exactLength',
        'maxLength',
        'rangeLength',
        'valueExact',
        'valueMin',
        'valueMax',
        'valueRange',
        'valueMultipleOf',
        'textPattern',
        'textPrefix',
        'textSuffix',
      ],
      additionalProperties: true,
    })
  })

  test('drops unsupported nodes and malformed metadata in best-effort mode', () => {
    const weirdLength = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'hasLength',
      bail: true,
    }, [[
      (value: string) => value.length,
      () => true,
      'length.weird',
      1,
    ]] as never)
    const weirdValue = assert((value: unknown): value is number => typeof value === 'number', {
      name: 'hasValue',
      bail: true,
    }, [[
      (value: number) => value,
      () => true,
      'number.weird',
      1,
    ]] as never)
    const invalidPatternDescriptor = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'hasPattern',
      bail: true,
    }, [[
      (value: string) => value,
      () => true,
      'string.pattern',
      'oops',
    ]] as never)
    const invalidStartsWithDescriptor = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'startsWith',
      bail: true,
    }, [[
      (value: string) => value,
      () => true,
      'string.starts-with',
      1,
    ]] as never)
    const invalidEndsWithDescriptor = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'endsWith',
      bail: true,
    }, [[
      (value: string) => value,
      () => true,
      'string.ends-with',
      1,
    ]] as never)
    const emptyPatternDescriptor = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'hasPattern',
      bail: true,
    })
    const emptyStartsWithDescriptor = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'startsWith',
      bail: true,
    })
    const emptyEndsWithDescriptor = assert((value: unknown): value is string => typeof value === 'string', {
      name: 'endsWith',
      bail: true,
    })
    const emptyMultipleOfDescriptor = assert((value: unknown): value is number => typeof value === 'number', {
      name: 'multipleOf',
      bail: true,
    })

    const bareValidator = custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
    })

    const weirdDescriptor = custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'mystery' as const,
        }
      },
    })

    expect(toJsonSchema(shape({
      invalidMetadata: meta(isDefined, {
        title: 42,
        examples: 'oops',
        deprecated: 'yes',
        default: { nested: true },
      } as never),
      unknownAssertion: assert((value: unknown): value is string => typeof value === 'string', {
        name: 'isCustomText',
        bail: true,
      }),
      weirdLength,
      weirdValue,
      invalidPatternDescriptor,
      invalidStartsWithDescriptor,
      invalidEndsWithDescriptor,
      emptyPatternDescriptor,
      emptyStartsWithDescriptor,
      emptyEndsWithDescriptor,
      emptyMultipleOfDescriptor,
      badExact: exact({ role: 'admin' }),
      badEnum: oneOf([{ role: 'admin' }] as never),
      invalidExactLength: hasLength({ exact: -1 as never }),
      invalidMinLength: hasLength({ min: -1 as never }),
      invalidMaxLength: hasLength({ max: -1 as never }),
      invalidRangeLength: hasLength({ range: [1, -1] as never }),
      invalidValueExact: hasValue({ exact: Number.POSITIVE_INFINITY as never }),
      invalidValueMin: hasValue({ min: Number.POSITIVE_INFINITY as never }),
      invalidValueMax: hasValue({ max: Number.POSITIVE_INFINITY as never }),
      invalidValueRange: hasValue({ range: [1, Number.NaN] as never }),
      invalidMultipleOf: multipleOf(0),
      invalidPattern: hasPattern(/ok/i),
      bigInt: isBigInt,
      blob: isBlob,
      date: isDate,
      file: isFile,
      fn: isFunction,
      map: isMap,
      nan: isNaN,
      set: isSet,
      symbol: isSymbol,
      validator: bareValidator,
      weirdDescriptor,
    }))).toEqual({
      type: 'object',
      properties: {
        invalidMetadata: {
          default: { nested: true },
          deprecated: 'yes',
        },
        unknownAssertion: {},
        weirdLength: {},
        weirdValue: {},
        invalidPatternDescriptor: {},
        invalidStartsWithDescriptor: {},
        invalidEndsWithDescriptor: {},
        emptyPatternDescriptor: {},
        emptyStartsWithDescriptor: {},
        emptyEndsWithDescriptor: {},
        emptyMultipleOfDescriptor: {},
        badExact: {},
        badEnum: {},
        invalidExactLength: {},
        invalidMinLength: {},
        invalidMaxLength: {},
        invalidRangeLength: {},
        invalidValueExact: {},
        invalidValueMin: {},
        invalidValueMax: {},
        invalidValueRange: {},
        invalidMultipleOf: {},
        invalidPattern: {},
        bigInt: {},
        blob: {},
        date: {},
        file: {},
        fn: {},
        map: {},
        nan: {},
        set: {},
        symbol: {},
        validator: {},
        weirdDescriptor: {},
      },
      required: [
        'invalidMetadata',
        'unknownAssertion',
        'weirdLength',
        'weirdValue',
        'invalidPatternDescriptor',
        'invalidStartsWithDescriptor',
        'invalidEndsWithDescriptor',
        'emptyPatternDescriptor',
        'emptyStartsWithDescriptor',
        'emptyEndsWithDescriptor',
        'emptyMultipleOfDescriptor',
        'badExact',
        'badEnum',
        'invalidExactLength',
        'invalidMinLength',
        'invalidMaxLength',
        'invalidRangeLength',
        'invalidValueExact',
        'invalidValueMin',
        'invalidValueMax',
        'invalidValueRange',
        'invalidMultipleOf',
        'invalidPattern',
        'bigInt',
        'blob',
        'date',
        'file',
        'fn',
        'map',
        'nan',
        'set',
        'symbol',
        'validator',
        'weirdDescriptor',
      ],
      additionalProperties: true,
    })
  })

  test('handles symbol-based discriminators in best-effort mode', () => {
    const discriminator = Symbol('kind')
    const variant = Symbol('ghost')

    expect(toJsonSchema(discriminatedUnion(discriminator, {
      user: shape({
        name: isString,
      }),
    }))).toEqual({})

    expect(toJsonSchema(discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      [variant]: shape({
        kind: exact('ghost'),
        name: isString,
      }),
    }))).toEqual({
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
      }, {}],
    })
  })

  test('handles descriptor assertions without args and shapes without required keys', () => {
    const exactWithoutArgs = custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'assertion' as const,
          name: 'exact',
          bail: true,
          code: 'value.exact',
          constraints: [],
        }
      },
    })

    const oneOfWithoutArgs = custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'assertion' as const,
          name: 'oneOf',
          bail: true,
          code: 'value.one-of',
          constraints: [],
        }
      },
    })

    expect(toJsonSchema(shape({
      exactWithoutArgs,
      oneOfWithoutArgs,
      maybeName: optional(isString),
      maybeStatus: oneOf([undefined, 'draft']),
    }))).toEqual({
      type: 'object',
      properties: {
        exactWithoutArgs: {},
        oneOfWithoutArgs: {},
        maybeName: {
          type: 'string',
        },
        maybeStatus: {},
      },
      required: ['oneOfWithoutArgs'],
      additionalProperties: true,
    })

    expect(toJsonSchema(shape({
      maybeName: optional(isString),
      maybeStatus: oneOf([undefined, 'draft']),
    }))).toEqual({
      type: 'object',
      properties: {
        maybeName: {
          type: 'string',
        },
        maybeStatus: {},
      },
      additionalProperties: true,
    })
  })

  test('reports strict export failures with root and symbol paths', () => {
    const secret = Symbol('secret')
    const discriminator = Symbol('kind')
    const variant = Symbol('ghost')

    expect(() => toJsonSchema(custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
    }), { mode: 'strict' })).toThrowError(
      'Cannot export validator at <root>: custom validators need a supported public descriptor'
    )

    expect(() => toJsonSchema(shape({
      [secret]: isString,
    }), { mode: 'strict' })).toThrowError(
      `Cannot export shape at ${String(secret)}: symbol keys cannot be represented in JSON Schema`
    )

    expect(() => toJsonSchema(shape({
      password: isString,
      confirmPassword: isString,
    }).fieldsMatch(['password', 'confirmPassword']), { mode: 'strict' })).toThrowError(
      'Cannot export shape at rules: object-level rule "fieldsMatch" has no JSON Schema mapping'
    )

    expect(() => toJsonSchema(discriminatedUnion(discriminator, {
      user: shape({
        name: isString,
      }),
    }), { mode: 'strict' })).toThrowError(
      'Cannot export discriminatedUnion at <root>: symbol discriminators cannot be represented in JSON Schema'
    )

    expect(() => toJsonSchema(discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      [variant]: shape({
        kind: exact('ghost'),
        name: isString,
      }),
    }), { mode: 'strict' })).toThrowError(
      `Cannot export discriminatedUnion at ${String(variant)}: symbol discriminator values cannot be represented in JSON Schema`
    )

    expect(() => toJsonSchema(assert((value: unknown): value is string => typeof value === 'string', {
      name: 'isCustomText',
      bail: true,
    }), { mode: 'strict' })).toThrowError(
      'Cannot export assertion at <root>: unsupported assertion "isCustomText"'
    )

    expect(() => toJsonSchema(custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'mystery' as const,
        }
      },
    }), { mode: 'strict' })).toThrowError(
      'Cannot export mystery at <root>: unsupported descriptor kind "mystery"'
    )
  })

  test('defaults JsonSchemaExportError path to the root when omitted', () => {
    const error = new JsonSchemaExportError('Unsupported', {
      descriptor: { kind: 'validator' },
      reason: 'reason',
    })

    expect(error.path).toEqual([])
  })
})
