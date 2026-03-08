# Metadata And Introspection

[Documentation index](./00-index.md)  
[Russian translation](../ru/02-metadata-and-introspection.md)

`@modulify/validator` exposes a public introspection layer built around two small entrypoints:

- `meta(...)` for attaching machine-readable metadata to any constraint;
- `describe(...)` for reading a stable recursive descriptor tree from built-in constraints and compatible custom validators.

This layer is intentionally adapter-oriented. It exists so application code and tooling can inspect validation structures without depending on private runtime internals.

## Quick Start

```typescript
import {
  describe,
  isString,
  meta,
  optional,
  shape,
} from '@modulify/validator'

const registration = meta(shape({
  email: meta(isString, {
    title: 'Email',
    format: 'email',
  }),
  nickname: optional(isString),
}).strict(), {
  title: 'Registration form',
})

const descriptor = describe(registration)
```

## What `meta(...)` Does

`meta(...)` attaches read-only machine-readable metadata to a constraint without changing validation semantics.

That means:

- the original constraint is not mutated;
- validation success and failure behavior stays the same;
- the metadata becomes visible through `describe(...)`;
- nested metadata remains attached exactly where it was applied.

Example:

```typescript
const email = meta(isString, {
  title: 'Email',
  widget: 'email',
})
```

The same mechanism works for:

- assertions;
- wrappers such as `optional(...)`;
- object shapes;
- structural validators such as `each(...)` or `tuple(...)`;
- custom validators.

## Metadata Is Explicit, Not Inherited

Metadata does not automatically flow through the descriptor tree.

If metadata is attached to a parent shape, it stays on that shape node. If metadata is attached to a child field, it stays on that child field node.

```typescript
const profile = meta(shape({
  email: meta(isString, { title: 'Email' }),
  name: isString,
}), {
  title: 'Profile',
})
```

In this example:

- the shape node gets `title: 'Profile'`;
- the `email` field gets `title: 'Email'`;
- the `name` field gets no metadata unless you annotate it explicitly.

This keeps metadata predictable and avoids hidden tree-wide behavior.

## Metadata Merging

If `meta(...)` is applied multiple times to the same constraint, metadata objects are merged from left to right.

```typescript
const annotated = meta(
  meta(isString, { title: 'Email' }),
  { placeholder: 'name@example.com' }
)
```

This produces one descriptor node whose `metadata` contains both keys.

## What `describe(...)` Returns

`describe(...)` returns a stable recursive descriptor tree.

The descriptor is intentionally machine-readable rather than presentation-oriented. It is designed for adapters and tooling, not for rendering built-in human-readable messages.

Examples of built-in `kind` values:

- `'assertion'`;
- `'allOf'`;
- `'optional'`, `'nullable'`, `'nullish'`;
- `'shape'`, `'each'`, `'tuple'`, `'record'`;
- `'union'`, `'discriminatedUnion'`;
- `'validator'` as a generic fallback for custom validators without a public structural descriptor.

## Assertion Descriptors

Leaf assertions produce descriptors with:

- `kind: 'assertion'`;
- `name`;
- `bail`;
- primary `code` and `args`;
- `constraints` for extra checker pipeline entries;
- optional `metadata`.

Example:

```typescript
const descriptor = describe(meta(isString, { title: 'Display name' }))
```

This makes assertion metadata visible without changing the assertion runtime itself.

## Wrapper And Structural Descriptors

Composed validators describe themselves recursively.

Examples:

- `optional(...)` exposes `child`;
- `each(...)` exposes `item`;
- `tuple(...)` exposes `items`;
- `union(...)` exposes `branches`;
- `record(...)` exposes `values`.

This recursive structure is what makes adapter layers possible without touching runtime validator internals.

## Shape Descriptors

Shapes provide one of the richest built-in descriptor nodes.

Shape descriptors include:

- `metadata`;
- `unknownKeys` with `'passthrough'` or `'strict'`;
- `fields` with one descriptor per object field;
- `rules` with compact summaries of object-level rules such as `refine(...)` and `fieldsMatch(...)`.

Example:

```typescript
const descriptor = describe(shape({
  email: meta(isString, { format: 'email' }),
  password: isString,
}).strict())
```

This is especially useful for:

- form adapters;
- contract adapters;
- custom documentation generators;
- JSON Schema export through a separate derivation layer.

## Object-Level Rules In Introspection

`refine(...)` callbacks themselves are not serialized.

Instead, shapes keep lightweight rule descriptors in `rules`.

Built-in examples:

- `fieldsMatch(...)` produces a compact `fieldsMatch` rule descriptor;
- `refine(...)` can accept a custom compact rule descriptor object.

This keeps the public descriptor tree stable and serializable enough for tooling, while avoiding the impossible task of serializing arbitrary callbacks.

## Custom Validators

Custom validators can participate in the same introspection layer through `custom(...)` plus a public `describe()` method.

```typescript
import { custom } from '@modulify/validator'

const isoDate = custom({
  check(value: unknown): value is string {
    return typeof value === 'string'
  },
  run() {
    return []
  },
  describe() {
    return {
      kind: 'stringFormat',
      format: 'iso-date',
    } as const
  },
})
```

Then:

- `describe(isoDate)` returns that public descriptor;
- `meta(...)` can still annotate the custom validator above it.

If a custom validator does not expose `describe()`, `describe(...)` falls back to:

```typescript
{ kind: 'validator' }
```

That fallback is intentionally minimal.

## Adapter Example

A small adapter can walk a shape descriptor and collect widget hints:

```typescript
import type { ConstraintDescriptor } from '@modulify/validator'

function collectFieldWidgets(node: ConstraintDescriptor) {
  if (node.kind !== 'shape') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(node.fields).map(([key, child]) => [key, child.metadata?.widget ?? 'text'])
  )
}
```

This is the main purpose of the introspection layer: external code can derive its own view without knowing how runtime validation is implemented internally.

## Relationship To JSON Schema Export

`toJsonSchema(...)` is a separate layer derived from the public descriptor contract.

That means:

- `describe(...)` is the public introspection source of truth;
- JSON Schema export builds on top of that public shape;
- the library does not maintain a second hidden schema model for exporters.

This separation is intentional:

- runtime validation stays runtime-first;
- metadata stays explicit;
- export behavior can evolve as a thin adapter layer.

## Practical Boundaries

Current boundaries of the metadata and introspection layer:

- no built-in message rendering or i18n;
- no metadata inheritance across the tree;
- no separate schema DSL alongside runtime constraints;
- no serialization of runtime callbacks from `refine(...)`;
- custom validators without public descriptors intentionally remain opaque.

## Practical Notes

- use `meta(...)` when you need machine-readable annotations, not hidden behavior;
- use `describe(...)` when you need a stable structural view of a constraint tree;
- keep custom descriptors compact and ecosystem-facing;
- prefer deriving external formats from descriptors instead of re-reading private validator internals.
