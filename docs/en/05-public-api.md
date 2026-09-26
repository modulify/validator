# Public API

[Documentation index](./00-index.md)  
[Russian translation](../ru/05-public-api.md)

This guide summarizes the package surface of `@modulify/validator` and its supported subpath exports.

It is meant as a navigation document:

- where each public entrypoint lives;
- which groups of functions are exported together;
- what the validation result looks like;
- which APIs belong to dedicated subpaths such as predicates and JSON Schema export.

## Root Package

The root package exports:

- `validate`
- `validate.sync`
- `matches.sync`
- `Guard`
- `Refinement`
- `meta`
- `describe`
- `custom`
- `collection`
- `ViolationCollection`
- all exports from `./assertions`
- all exports from `./combinators`

Use the root package when you need the main validation API, composed validators, metadata/introspection, and violation utilities.

## Assertions And Combinators

The root package includes:

- low-level assertion construction through `assert(...)` and `refine(...)`
- built-in guard assertions such as `isString`, `isNumber`, `isBoolean`, `isNull`, `isEmail`, `oneOf(...)`
- built-in refinement assertions such as `hasLength(...)`, `hasSize(...)`, `hasPattern(...)`, `startsWith(...)`, `hasValue(...)`, `multipleOf(...)`
- structural combinators such as `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`
- wrapper combinators such as `optional(...)`, `nullable(...)`, `nullish(...)`
- branching combinators such as `union(...)` and `discriminatedUnion(...)`
- exact-value matching through `exact(...)`

This is the main runtime-facing API surface of the library.

Sequential assertion arrays are stage-aware: a compatible tuple such as `[isString, hasLength({ min: 3 })]` is supported directly, while incompatible combinations are rejected by the type system.
Refinement assertions are staged helpers, so `validate(...)` and `matches.sync(...)` expect them to appear after a compatible guard instead of being passed on their own.

## Metadata And Introspection

The same root package also includes:

- `meta(...)`
- `describe(...)`
- `custom(...)`

Together these provide the public machine-readable descriptor contract and the metadata layer built on top of it.

## Violation Utilities

The root package also includes:

- raw violation results returned by `validate(...)`
- `collection(...)`
- `ViolationCollection`

These are the main utilities for post-processing machine-readable validation failures.

## Validation Result

`validate(...)` and `validate.sync(...)` return:

```typescript
type ValidationResult<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

Practical meaning:

- `ok` tells whether validation succeeded;
- `validated` becomes strongly typed only in the success branch;
- `violations` is empty on success and contains structured failures on error.
- `validate(...)` is the default async-first entrypoint;
- `validate.sync(...)` throws explicitly when it encounters async validators or async object-level `shape(...).refine(...)` rules.

## Predicates Subpath

Predicates are available from:

```typescript
@modulify/validator/predicates
```

This subpath contains reusable runtime/type-guard helpers and predicate combinators such as:

- `isString`
- `isNumber`
- `isRecord`
- `isArray`
- `isShape`
- `And`, `Or`, `Not`

Use this subpath when you want guard-style runtime checks without pulling in the higher-level validation layer.

In `isShape({ name: [isString, false] })`, an optional field may be absent,
but a present value is always checked by its predicate. This includes explicit
`undefined`: use `Or(isString, isUndefined)` to allow it.
The shorthand `name: isString` and the tuple `[isString, true]` define required fields.
Field presence is checked with `in`, including properties in the prototype chain.

## JSON Schema Export Subpath

JSON Schema export is available from:

```typescript
@modulify/validator/json-schema
```

This subpath contains:

- `toJsonSchema(...)`
- `JsonSchemaExportError`

It is intentionally kept separate from the root package so that export-specific concerns stay isolated from the main validation entrypoint.

## How To Read The Package Surface

At a high level:

- root package = validation, combinators, metadata, violations;
- `./predicates` = standalone runtime/type-guard helpers;
- `./json-schema` = derived JSON Schema export layer.

This split keeps the main API discoverable while still allowing specialized subpaths where needed.
