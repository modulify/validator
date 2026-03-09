import type {
  Constraint,
  ConstraintDescriptor,
  MaybeMany,
} from './index'

/** JSON Schema primitive `type` values used by `toJsonSchema(...)`. */
export type JsonSchemaTypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'

/** Minimal JSON Schema object shape emitted by the built-in exporter. */
export interface JsonSchema {
  readonly $schema?: string;
  readonly $id?: string;
  readonly $comment?: string;
  readonly title?: string;
  readonly description?: string;
  readonly format?: string;
  readonly default?: unknown;
  readonly examples?: readonly unknown[];
  readonly deprecated?: boolean;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;
  readonly type?: JsonSchemaTypeName | readonly JsonSchemaTypeName[];
  readonly const?: unknown;
  readonly enum?: readonly unknown[];
  readonly allOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
  readonly oneOf?: readonly JsonSchema[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | JsonSchema;
  readonly items?: JsonSchema;
  readonly prefixItems?: readonly JsonSchema[];
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly multipleOf?: number;
}

/** Controls how `toJsonSchema(...)` handles constraints that cannot be represented faithfully. */
export type JsonSchemaExportMode = 'bestEffort' | 'strict'

/** Options for the JSON Schema exporter. */
export interface ToJsonSchemaOptions {
  readonly mode?: JsonSchemaExportMode
}

/** Error thrown by `toJsonSchema(...)` in strict mode when a node cannot be exported faithfully. */
export declare class JsonSchemaExportError extends Error {
  constructor(message: string, options: {
    descriptor: ConstraintDescriptor
    reason: string
    path?: readonly PropertyKey[]
  })
  readonly descriptor: ConstraintDescriptor
  readonly reason: string
  readonly path: readonly PropertyKey[]
}

/** Derives a JSON Schema object from one or many public constraint descriptors. */
export declare const toJsonSchema: <const C extends MaybeMany<Constraint>>(
  constraints: C,
  options?: ToJsonSchemaOptions
) => JsonSchema
