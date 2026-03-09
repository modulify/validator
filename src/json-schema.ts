import type {
  AllOfConstraintDescriptor,
  AssertionDescriptor,
  Constraint,
  ConstraintDescriptor,
  ConstraintMetadata,
  DiscriminatedUnionConstraintDescriptor,
  EachConstraintDescriptor,
  ObjectShapeRuleDescriptor,
  RecordConstraintDescriptor,
  ShapeConstraintDescriptor,
  TupleConstraintDescriptor,
  UnionConstraintDescriptor,
  WrapperConstraintDescriptor,
  MaybeMany,
} from '~types'
import type {
  JsonSchema,
  JsonSchemaExportMode,
  ToJsonSchemaOptions,
} from '~types/json-schema'
export type {
  JsonSchema,
  JsonSchemaExportMode,
  JsonSchemaTypeName,
  ToJsonSchemaOptions,
} from '~types/json-schema'

import { describeConstraints } from '@/metadata'

type ExportContext = {
  mode: JsonSchemaExportMode;
  path: PropertyKey[];
}

type MutableJsonSchema = {
  -readonly [K in keyof JsonSchema]?: JsonSchema[K];
}

type JsonSchemaMetadataKey =
  | 'title'
  | 'description'
  | 'format'
  | 'default'
  | 'examples'
  | 'deprecated'
  | 'readOnly'
  | 'writeOnly'

const jsonSchemaMetadataKeys: readonly JsonSchemaMetadataKey[] = [
  'title',
  'description',
  'format',
  'default',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
]

const typeOf = (value: unknown) => Object.prototype.toString.call(value)

const isEmptySchema = (schema: JsonSchema) => Object.keys(schema).length === 0

const isFiniteJsonNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isJsonScalar = (value: unknown): value is string | number | boolean | null => {
  return value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || isFiniteJsonNumber(value)
}

const isLength = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const withPath = (context: ExportContext, segment: PropertyKey): ExportContext => ({
  ...context,
  path: [...context.path, segment],
})

const formatPath = (path: readonly PropertyKey[]) => path.length === 0
  ? '<root>'
  : path.map(segment => typeof segment === 'symbol' ? segment.toString() : String(segment)).join('.')

const setSchemaProperty = <K extends keyof JsonSchema>(
  schema: MutableJsonSchema,
  key: K,
  value: JsonSchema[K]
) => {
  schema[key] = value
}

const pickMetadata = (metadata: ConstraintMetadata | undefined): MutableJsonSchema => {
  if (!metadata) {
    return {}
  }

  const schemaMetadata: MutableJsonSchema = {}

  jsonSchemaMetadataKeys.forEach(key => {
    if (!(key in metadata)) {
      return
    }

    const value = metadata[key]

    if (key === 'examples') {
      if (Array.isArray(value)) {
        setSchemaProperty(schemaMetadata, 'examples', [...value])
      }

      return
    }

    if (key === 'default') {
      setSchemaProperty(schemaMetadata, 'default', value)

      return
    }

    if ((key === 'deprecated' || key === 'readOnly' || key === 'writeOnly') && typeof value === 'boolean') {
      setSchemaProperty(schemaMetadata, key, value)

      return
    }

    if (typeof value === 'string') {
      setSchemaProperty(schemaMetadata, key, value)
    }
  })

  return schemaMetadata
}

const applyMetadata = (schema: JsonSchema, metadata: ConstraintMetadata | undefined): JsonSchema => {
  const schemaMetadata = pickMetadata(metadata)
  const nextSchema: MutableJsonSchema = { ...schema }

  jsonSchemaMetadataKeys.forEach(key => {
    if (!(key in schemaMetadata) || key in nextSchema) {
      return
    }

    setSchemaProperty(nextSchema, key, schemaMetadata[key] as JsonSchema[typeof key])
  })

  return nextSchema
}

export class JsonSchemaExportError extends Error {
  readonly descriptor: ConstraintDescriptor
  readonly reason: string
  readonly path: readonly PropertyKey[]

  constructor(
    message: string,
    {
      descriptor,
      path = [],
      reason,
    }: {
      descriptor: ConstraintDescriptor;
      reason: string;
      path?: readonly PropertyKey[];
    }
  ) {
    super(message)

    this.name = 'JsonSchemaExportError'
    this.descriptor = descriptor
    this.reason = reason
    this.path = [...path]
  }
}

const unsupported = (
  descriptor: ConstraintDescriptor,
  context: ExportContext,
  reason: string
): JsonSchema => {
  if (context.mode === 'strict') {
    throw new JsonSchemaExportError(
      `Cannot export ${descriptor.kind} at ${formatPath(context.path)}: ${reason}`,
      { descriptor, path: context.path, reason }
    )
  }

  return {}
}

const mergeNullable = (schema: JsonSchema): JsonSchema => {
  if (isEmptySchema(schema)) {
    return schema
  }

  return {
    anyOf: [schema, { type: 'null' }],
  }
}

const toPropertyName = (
  key: PropertyKey,
  descriptor: ConstraintDescriptor,
  context: ExportContext
) => {
  if (typeof key === 'symbol') {
    return unsupported(descriptor, context, 'symbol keys cannot be represented in JSON Schema')
  }

  return String(key)
}

const lengthSchema = (
  descriptor: AssertionDescriptor,
  context: ExportContext
): JsonSchema => {
  const stringSchema: MutableJsonSchema = { type: 'string' }
  const arraySchema: MutableJsonSchema = { type: 'array' }

  for (const constraint of descriptor.constraints) {
    switch (constraint.code) {
      case 'length.exact': {
        const exact = constraint.args[0]

        if (!isLength(exact)) {
          return unsupported(descriptor, context, 'hasLength exact bounds must be non-negative integers')
        }

        setSchemaProperty(stringSchema, 'minLength', exact)
        setSchemaProperty(stringSchema, 'maxLength', exact)
        setSchemaProperty(arraySchema, 'minItems', exact)
        setSchemaProperty(arraySchema, 'maxItems', exact)
        break
      }

      case 'length.min': {
        const min = constraint.args[0]

        if (!isLength(min)) {
          return unsupported(descriptor, context, 'hasLength minimum bounds must be non-negative integers')
        }

        setSchemaProperty(stringSchema, 'minLength', min)
        setSchemaProperty(arraySchema, 'minItems', min)
        break
      }

      case 'length.max': {
        const max = constraint.args[0]

        if (!isLength(max)) {
          return unsupported(descriptor, context, 'hasLength maximum bounds must be non-negative integers')
        }

        setSchemaProperty(stringSchema, 'maxLength', max)
        setSchemaProperty(arraySchema, 'maxItems', max)
        break
      }

      case 'length.range': {
        const range = constraint.args[0]

        if (!Array.isArray(range) || range.length !== 2 || !isLength(range[0]) || !isLength(range[1])) {
          return unsupported(descriptor, context, 'hasLength ranges must be `[min, max]` integer tuples')
        }

        setSchemaProperty(stringSchema, 'minLength', range[0])
        setSchemaProperty(stringSchema, 'maxLength', range[1])
        setSchemaProperty(arraySchema, 'minItems', range[0])
        setSchemaProperty(arraySchema, 'maxItems', range[1])
        break
      }

      default:
        return unsupported(descriptor, context, `unsupported hasLength constraint "${constraint.code}"`)
    }
  }

  return {
    anyOf: [stringSchema, arraySchema],
  }
}

const exactSchema = (
  descriptor: AssertionDescriptor,
  context: ExportContext
): JsonSchema => {
  const [value] = descriptor.args ?? []

  if (!isJsonScalar(value)) {
    return unsupported(
      descriptor,
      context,
      `exact(...) supports only JSON scalar values, got ${typeOf(value)}`
    )
  }

  return { const: value }
}

const enumSchema = (
  descriptor: AssertionDescriptor,
  context: ExportContext
): JsonSchema => {
  const [values] = descriptor.args ?? []

  if (!Array.isArray(values) || values.some(value => !isJsonScalar(value))) {
    return unsupported(
      descriptor,
      context,
      'oneOf(...) supports only arrays of JSON scalar values'
    )
  }

  return { enum: [...new Set(values)] }
}

const assertionAcceptsUndefined = (descriptor: AssertionDescriptor) => {
  switch (descriptor.name) {
    case 'exact':
      return descriptor.args?.[0] === undefined

    case 'oneOf': {
      const [values] = descriptor.args ?? []

      return Array.isArray(values) && values.includes(undefined)
    }

    default:
      return false
  }
}

const acceptsUndefined = (descriptor: ConstraintDescriptor): boolean => {
  switch (descriptor.kind) {
    case 'optional':
    case 'nullish':
      return true

    case 'nullable':
    case 'each':
    case 'tuple':
    case 'record':
    case 'shape':
    case 'discriminatedUnion':
    case 'validator':
      return false

    case 'allOf':
      return (descriptor as AllOfConstraintDescriptor).constraints.every(acceptsUndefined)

    case 'union':
      return (descriptor as UnionConstraintDescriptor).branches.some(acceptsUndefined)

    case 'assertion':
      return assertionAcceptsUndefined(descriptor as AssertionDescriptor)

    default:
      return false
  }
}

const exportShapeRules = (
  descriptor: ShapeConstraintDescriptor,
  context: ExportContext
) => {
  if (descriptor.rules.length === 0 || context.mode === 'bestEffort') {
    return
  }

  const [rule] = descriptor.rules

  throw new JsonSchemaExportError(
    `Cannot export shape at ${formatPath([...context.path, 'rules'])}: object-level rule "${rule.kind}" has no JSON Schema mapping`,
    {
      descriptor,
      path: [...context.path, 'rules'],
      reason: `object-level rule "${rule.kind}" has no JSON Schema mapping`,
    }
  )
}

const exportAssertion = (
  descriptor: AssertionDescriptor,
  context: ExportContext
): JsonSchema => {
  switch (descriptor.name) {
    case 'isString':
      return { type: 'string' }

    case 'isNumber':
      return { type: 'number' }

    case 'isBoolean':
      return { type: 'boolean' }

    case 'isBigInt':
      return unsupported(descriptor, context, 'bigint values cannot be represented in JSON Schema')

    case 'isBlob':
      return unsupported(descriptor, context, 'Blob instances do not have a stable JSON Schema representation')

    case 'isNull':
      return { type: 'null' }

    case 'isEmail':
      return {
        type: 'string',
        format: 'email',
      }

    case 'isFile':
      return unsupported(descriptor, context, 'File instances do not have a stable JSON Schema representation')

    case 'isFunction':
      return unsupported(descriptor, context, 'functions cannot be represented in JSON Schema')

    case 'isDefined':
      return {}

    case 'isMap':
      return unsupported(descriptor, context, 'Map instances do not have a stable JSON Schema representation')

    case 'isNaN':
      return unsupported(descriptor, context, 'NaN cannot be represented in JSON Schema')

    case 'exact':
      return exactSchema(descriptor, context)

    case 'oneOf':
      return enumSchema(descriptor, context)

    case 'hasLength':
      return lengthSchema(descriptor, context)

    case 'isDate':
      return unsupported(descriptor, context, 'Date instances do not have a stable JSON Schema representation')

    case 'isSet':
      return unsupported(descriptor, context, 'Set instances do not have a stable JSON Schema representation')

    case 'isSymbol':
      return unsupported(descriptor, context, 'symbols cannot be represented in JSON Schema')

    default:
      return unsupported(descriptor, context, `unsupported assertion "${descriptor.name}"`)
  }
}

const exportDiscriminatedUnion = (
  descriptor: DiscriminatedUnionConstraintDescriptor,
  context: ExportContext
): JsonSchema => {
  if (typeof descriptor.key === 'symbol') {
    return unsupported(descriptor, context, 'symbol discriminators cannot be represented in JSON Schema')
  }

  const key = String(descriptor.key)
  const variants = descriptor.variants as Record<PropertyKey, ConstraintDescriptor>
  const branches: JsonSchema[] = Reflect.ownKeys(variants).map(variantKey => {
    if (typeof variantKey === 'symbol') {
      return unsupported(descriptor, withPath(context, variantKey), 'symbol discriminator values cannot be represented in JSON Schema')
    }

    const variant = variants[variantKey]
    const branch = exportDescriptor(variant, withPath(context, variantKey))

    return {
      allOf: [{
        type: 'object' as const,
        properties: {
          [key]: {
            const: variantKey,
          },
        },
        required: [key],
      }, branch],
    }
  })

  return {
    oneOf: branches,
  }
}

const exportRulesAsComment = (
  rules: readonly ObjectShapeRuleDescriptor[],
  schema: JsonSchema
): JsonSchema => ({
  ...schema,
  $comment: `Dropped ${rules.length} object rule(s) during best-effort JSON Schema export.`,
})

const exportDescriptor = (
  descriptor: ConstraintDescriptor,
  context: ExportContext
): JsonSchema => {
  let schema: JsonSchema

  switch (descriptor.kind) {
    case 'assertion':
      schema = exportAssertion(descriptor as AssertionDescriptor, context)
      break

    case 'allOf': {
      const allOfDescriptor = descriptor as AllOfConstraintDescriptor

      schema = {
        allOf: allOfDescriptor.constraints.map((child, index) => exportDescriptor(child, withPath(context, index))),
      }
      break
    }

    case 'optional': {
      const wrapperDescriptor = descriptor as WrapperConstraintDescriptor

      schema = exportDescriptor(wrapperDescriptor.child, withPath(context, 'optional'))
      break
    }

    case 'nullable':
    case 'nullish': {
      const wrapperDescriptor = descriptor as WrapperConstraintDescriptor

      schema = mergeNullable(exportDescriptor(wrapperDescriptor.child, withPath(context, descriptor.kind)))
      break
    }

    case 'each': {
      const eachDescriptor = descriptor as EachConstraintDescriptor

      schema = {
        type: 'array',
        items: exportDescriptor(eachDescriptor.item, withPath(context, 'items')),
      }
      break
    }

    case 'tuple': {
      const tupleDescriptor = descriptor as TupleConstraintDescriptor

      schema = {
        type: 'array',
        prefixItems: tupleDescriptor.items.map((item, index) => exportDescriptor(item, withPath(context, index))),
        minItems: tupleDescriptor.items.length,
        maxItems: tupleDescriptor.items.length,
      }
      break
    }

    case 'union': {
      const unionDescriptor = descriptor as UnionConstraintDescriptor

      schema = {
        anyOf: unionDescriptor.branches.map((branch, index) => exportDescriptor(branch, withPath(context, index))),
      }
      break
    }

    case 'record': {
      const recordDescriptor = descriptor as RecordConstraintDescriptor

      schema = {
        type: 'object',
        additionalProperties: exportDescriptor(recordDescriptor.values, withPath(context, 'additionalProperties')),
      }
      break
    }

    case 'shape': {
      const shapeDescriptor = descriptor as ShapeConstraintDescriptor
      const fields = shapeDescriptor.fields as Record<PropertyKey, ConstraintDescriptor>
      const rules = shapeDescriptor.rules as readonly ObjectShapeRuleDescriptor[]

      exportShapeRules(shapeDescriptor, context)

      const properties: Record<string, JsonSchema> = {}
      const required: string[] = []

      Reflect.ownKeys(fields).forEach(key => {
        const childContext = withPath(context, key)
        const propertyName = toPropertyName(key, shapeDescriptor, childContext)

        if (typeof propertyName !== 'string') {
          return
        }

        const child = fields[key]

        properties[propertyName] = exportDescriptor(child, childContext)

        if (!acceptsUndefined(child)) {
          required.push(propertyName)
        }
      })

      const shapeSchema: MutableJsonSchema = {
        type: 'object',
        properties,
        additionalProperties: shapeDescriptor.unknownKeys === 'strict'
          ? false
          : true,
      }

      if (required.length > 0) {
        setSchemaProperty(shapeSchema, 'required', required)
      }

      schema = shapeSchema

      if (rules.length > 0 && context.mode === 'bestEffort') {
        schema = exportRulesAsComment(rules, schema)
      }

      break
    }

    case 'discriminatedUnion':
      schema = exportDiscriminatedUnion(descriptor as DiscriminatedUnionConstraintDescriptor, context)
      break

    case 'validator':
      schema = unsupported(descriptor, context, 'custom validators need a supported public descriptor')
      break

    default:
      schema = unsupported(descriptor, context, `unsupported descriptor kind "${descriptor.kind}"`)
      break
  }

  return applyMetadata(schema, descriptor.metadata)
}

export const toJsonSchema = <const C extends MaybeMany<Constraint>>(
  constraints: C,
  options: ToJsonSchemaOptions = {}
): JsonSchema => {
  const descriptor = describeConstraints(constraints)
  const context: ExportContext = {
    mode: options.mode ?? 'bestEffort',
    path: [],
  }

  return exportDescriptor(descriptor, context)
}
