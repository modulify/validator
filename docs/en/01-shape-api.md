# Shape API

[Documentation index](./00-index.md)  
[Russian translation](../ru/01-shape-api.md)

`shape(...)` is the reusable object-shape API in `@modulify/validator`.

It keeps the same runtime validation kernel as the rest of the library, but adds a small immutable object-oriented layer for:

- nested object validation;
- reusable object schemas;
- derived shapes such as `pick(...)`, `omit(...)`, and `partial(...)`;
- object-level rules such as `refine(...)` and `fieldsMatch(...)`;
- descriptor-based introspection through `describe(...)`.

## Quick Start

```typescript
import {
  exact,
  isString,
  optional,
  shape,
  validate,
} from '@modulify/validator'

const profile = shape({
  id: isString,
  nickname: optional(isString),
  role: exact('admin'),
}).strict()

const [ok, validated, violations] = validate.sync({
  id: 'u1',
  nickname: 'neo',
  role: 'admin',
}, profile)
```

`shape(...)` returns a validator, so it can be used anywhere a regular constraint is accepted.

## Mental Model

A shape is still a validator. The extra API is a thin wrapper around an object descriptor and a small set of immutable derivation helpers.

Each field in the descriptor may contain:

- a single constraint;
- an array of constraints that run sequentially;
- another structural validator such as `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`, `union(...)`, or `discriminatedUnion(...)`.

That means object validation stays aligned with the rest of the library:

- field-level checks reuse the same assertions and combinators;
- violations keep regular nested `path` values;
- introspection goes through the same `describe(...)` contract;
- metadata stays opt-in through `meta(...)`.

## Basic Shape Construction

```typescript
import {
  hasLength,
  isDefined,
  isString,
  shape,
} from '@modulify/validator'

const registration = shape({
  email: [isDefined, isString],
  password: [isString, hasLength({ min: 8 })],
})
```

Runtime behavior:

- the input must be a plain record-like object;
- every declared field is validated against its own slot;
- nested violations are reported on the field path;
- unknown keys are allowed by default.

## Unknown Keys

Shapes have two unknown-key modes:

- `'passthrough'` - extra keys are allowed;
- `'strict'` - extra keys produce `shape.unknown-key` violations on the extra key path.

`shape(...)` starts in `'passthrough'` mode.

```typescript
const profile = shape({
  id: isString,
})

const strictProfile = profile.strict()
const permissiveProfile = strictProfile.passthrough()
```

Important behavior:

- `strict()` and `passthrough()` keep the same field descriptor;
- `strict()` and `passthrough()` keep existing object-level rules;
- only the unknown-key handling changes.

## Exposed Shape Properties

Shape instances expose:

- `descriptor` - the current object descriptor;
- `unknownKeys` - the current unknown-key mode;
- all standard validator behavior through `check(...)` and `run(...)`.

This is useful when a shape needs to be validated, described, and then derived further without rebuilding it from scratch.

## Derived Shapes

All shape helpers are immutable. Each call returns a new shape.

### `pick(keys)` and `omit(keys)`

Use these when you need a subset of the current object schema.

```typescript
const profile = shape({
  id: isString,
  nickname: optional(isString),
  role: exact('admin'),
})

const publicProfile = profile.pick(['id', 'nickname'])
const internalProfile = profile.omit(['nickname'])
```

### `partial()`

`partial()` wraps every field in `optional(...)`.

```typescript
const editableProfile = profile.partial()
```

This follows the current library model where:

- an omitted key;
- and a key with value `undefined`;

are treated the same during validation.

### `extend(descriptor)`

`extend(...)` adds or overrides fields using a plain object descriptor.

```typescript
const account = profile.extend({
  team: isString,
})
```

### `merge(shape)`

`merge(...)` merges another shape into the current one.

```typescript
const account = profile.merge(shape({
  team: isString,
  role: exact('editor'),
}))
```

Behavior notes:

- the receiver keeps its own unknown-key mode;
- overlapping keys are overridden by the right-hand shape;
- object-level rules from the merged shape are not combined into a new shared rule set.

## Rule Retention Semantics

There is an intentional distinction between mode switches and structural derivations.

`strict()` and `passthrough()` keep object-level rules because the same shape structure is still present.

`pick()`, `omit()`, `partial()`, `extend()`, and `merge()` drop object-level rules intentionally, because generic refinements are opaque and may depend on fields that are no longer present or now behave differently.

This keeps derived schemas predictable instead of guessing whether an old refinement is still valid.

## Object-Level Rules

Shapes can express cross-field invariants without introducing a second schema language.

### `refine(...)`

`refine(...)` adds a synchronous object-level rule that runs only after the base shape has already validated successfully as an object.

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).refine(value => {
  return value.password === value.confirmPassword
    ? []
    : [{
      path: ['confirmPassword'],
      code: 'shape.fields.mismatch',
      args: [['password', 'confirmPassword']],
    }]
})
```

`refine(...)` is intentionally thin:

- it is sync-only;
- it returns `[]`, `null`, or `undefined` when the rule passes;
- it returns one issue or an array of issues when it fails;
- `path` is relative to the current shape and defaults to `[]`;
- `value` is optional and defaults to the object value at that relative path;
- `code` stays machine-readable.

Produced violations use:

- `violates.kind === 'validator'`;
- `violates.name === 'shape'`.

### Describing a refine rule

Callbacks themselves are not serialized, but you can attach a compact machine-readable descriptor to the rule:

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).refine(value => {
  return value.password === value.confirmPassword
    ? []
    : [{ path: ['confirmPassword'], code: 'shape.fields.mismatch' }]
}, {
  kind: 'passwordConfirmation',
  metadata: {
    fields: ['password', 'confirmPassword'],
  },
})
```

This shows up later in `describe(...)` under the shape `rules` array.

### `fieldsMatch(...)`

`fieldsMatch(...)` is a small helper for the common confirmation-field case.

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).fieldsMatch(['password', 'confirmPassword'])
```

It also supports nested selectors:

```typescript
const registration = shape({
  password: isString,
  confirm: shape({
    password: isString,
  }),
}).fieldsMatch(['password', ['confirm', 'password']])
```

## Validation Order

At a high level, shape validation works like this:

1. The input must be a plain record-like object.
2. Every declared field is validated recursively.
3. Strict unknown-key checks run if the shape is in `'strict'` mode.
4. Object-level rules run only if structural validation succeeded first.

That ordering matters because object-level rules can then assume a stable validated object shape.

## Nested Shapes

Shapes can be nested freely because they are regular validators.

```typescript
const form = shape({
  profile: shape({
    email: isString,
    nickname: optional(isString),
  }).strict(),
})
```

Nested failures keep precise paths such as `['profile', 'email']`.

## Introspection

Shapes participate in the public descriptor tree returned by `describe(...)`.

```typescript
import { describe } from '@modulify/validator'

const descriptor = describe(shape({
  email: isString,
}).strict())
```

Shape descriptors expose:

- `unknownKeys`;
- `fields`;
- `rules`;
- optional `metadata`.

This is useful for adapters, tooling, and derived exports such as JSON Schema.

## Metadata

`meta(...)` can annotate shapes and their fields without changing validation semantics.

```typescript
import {
  describe,
  meta,
} from '@modulify/validator'

const profile = meta(shape({
  email: meta(isString, {
    title: 'Email',
    format: 'email',
  }),
}).strict(), {
  title: 'Profile',
})

const descriptor = describe(profile)
```

Metadata stays explicit:

- there is no implicit inheritance across the tree;
- shape metadata and field metadata are attached exactly where `meta(...)` was applied.

## Practical Notes

- `shape(...)` is object-focused, not schema-first;
- it reuses the same constraints you already use elsewhere in the library;
- derived helpers are intentionally small and predictable;
- object-level rules are expressive, but intentionally lightweight;
- mismatch between runtime semantics and external schema formats should be handled explicitly through adapter layers such as `describe(...)` or `toJsonSchema(...)`.
