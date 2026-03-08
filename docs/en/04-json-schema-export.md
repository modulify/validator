# JSON Schema Export

[Documentation index](./00-index.md)  
[Russian translation](../ru/04-json-schema-export.md)

`@modulify/validator/json-schema` provides a thin JSON Schema export layer on top of the public descriptor contract.

It is intentionally a derivation layer, not a second schema model. The exporter reads public descriptors and builds a JSON Schema view from them.

## Quick Start

```typescript
import {
  isNumber,
  isString,
  meta,
  optional,
  shape,
} from '@modulify/validator'
import { toJsonSchema } from '@modulify/validator/json-schema'

const profile = meta(shape({
  email: meta(isString, {
    title: 'Email',
    format: 'email',
  }),
  age: optional(isNumber),
}).strict(), {
  title: 'Profile',
})

const jsonSchema = toJsonSchema(profile)
```

## Mental Model

The export flow is intentionally small:

1. validators expose public descriptors through `describe(...)`;
2. `toJsonSchema(...)` derives a JSON Schema document from those descriptors;
3. unsupported or opaque nodes are either dropped in best-effort mode or rejected in strict mode.

This separation matters because:

- runtime validation stays runtime-first;
- exporter behavior stays explicit;
- custom tooling can depend on one public introspection contract.

## Entry Point

Import JSON Schema export from the dedicated subpath:

```typescript
import {
  JsonSchemaExportError,
  toJsonSchema,
} from '@modulify/validator/json-schema'
```

The root package intentionally does not re-export this API.

## Supported Built-In Mappings

The exporter covers the built-in descriptor set that already participates in public introspection.

### Leaf assertions

Supported practical mappings include:

- `isString` -> `type: 'string'`
- `isNumber` -> `type: 'number'`
- `isBoolean` -> `type: 'boolean'`
- `isNull` -> `type: 'null'`
- `isEmail` -> `type: 'string'` plus `format: 'email'`
- `exact(...)` -> `const`
- `oneOf(...)` -> `enum`
- `hasLength(...)` -> string/array length constraints

### Wrappers

Supported wrappers:

- `optional(...)`
- `nullable(...)`
- `nullish(...)`

`optional(...)` affects object `required` calculation. `nullable(...)` and `nullish(...)` are exported as unions with `null`.

### Structural combinators

Supported structural mappings:

- `shape(...)`
- `each(...)`
- `tuple(...)`
- `record(...)`

### Branching combinators

Supported branching mappings:

- `union(...)`
- `discriminatedUnion(...)`

### Sequential slots

Array slots with multiple constraints are exported as JSON Schema `allOf`.

## Object Schema Mapping

`shape(...)` is exported as a JSON Schema object with:

- `type: 'object'`
- `properties`
- `required`
- `additionalProperties`

Unknown-key handling maps like this:

- `.strict()` -> `additionalProperties: false`
- default or `.passthrough()` -> `additionalProperties: true`

## `required` And `undefined`

One important boundary is object field presence.

The runtime layer treats:

- a missing key;
- and a key whose value is `undefined`;

as the same case in several practical scenarios, especially around `optional(...)` and derived helpers such as `partial()`.

JSON Schema does not model that behavior the same way. Because of that, the exporter approximates field presence through JSON Schema `required` rather than claiming exact semantic parity.

That approximation is intentional and should be treated as an interoperability layer, not as a promise that runtime and JSON Schema semantics are identical.

## Metadata Mapping

The exporter does not blindly copy all metadata into JSON Schema.

Instead, it maps a small explicit whitelist:

- `title`
- `description`
- `format`
- `default`
- `examples`
- `deprecated`
- `readOnly`
- `writeOnly`

Other metadata stays library-specific and is left out of the exported schema automatically.

This keeps the metadata layer explicit and avoids turning it into implicit export magic.

## Best-Effort Mode

Best-effort mode is the default:

```typescript
const schema = toJsonSchema(profile)
```

In this mode:

- unsupported or opaque nodes become permissive `{}` schema nodes;
- unsupported object-level shape rules are dropped;
- dropped shape rules are marked with a `$comment` when practical.

This mode is useful when you want the broadest possible external schema even if some runtime semantics cannot be expressed faithfully.

## Strict Mode

Strict mode rejects unsupported nodes:

```typescript
const schema = toJsonSchema(profile, { mode: 'strict' })
```

When export cannot be represented faithfully, the exporter throws `JsonSchemaExportError`.

That error exposes:

- the descriptor that failed;
- the machine-readable reason;
- the descriptor path where the failure happened.

Strict mode is useful when silent fallback would be misleading.

## Unsupported And Opaque Cases

Some runtime behavior does not have a faithful JSON Schema representation.

Important examples:

- custom validators without a supported public descriptor;
- unknown custom descriptor kinds;
- object-level `refine(...)` rules;
- descriptor nodes whose semantics depend on runtime-only behavior;
- values that are not representable as practical JSON Schema constants or enums.

The exporter keeps these boundaries explicit instead of guessing.

## Relationship To `describe(...)`

`toJsonSchema(...)` is downstream from `describe(...)`.

That means:

- JSON Schema export should rely on public descriptors;
- exporter logic should not depend on private runtime shape internals;
- custom validators participate by exposing a public descriptor contract first.

This keeps the architecture thin and stable for external tooling.

## Example: Metadata-Aware Shape Export

```typescript
const profile = meta(shape({
  email: meta(isString, {
    title: 'Email',
    format: 'email',
  }),
  age: optional(isNumber),
}).strict(), {
  title: 'Profile',
})

const schema = toJsonSchema(profile)
```

Practical result:

- shape metadata can become schema metadata;
- field metadata can become property metadata;
- strict object behavior becomes `additionalProperties: false`.

## Example: Strict Failure

```typescript
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

toJsonSchema(schema, { mode: 'strict' })
```

This throws because the custom validator stays opaque to the exporter.

## Practical Notes

- treat JSON Schema export as an interoperability layer;
- use best-effort mode when partial export is acceptable;
- use strict mode when unsupported semantics must fail loudly;
- keep custom descriptors compact and public if they are meant to participate in export;
- do not assume JSON Schema export replaces runtime validation semantics.
