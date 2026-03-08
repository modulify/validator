# Violations

[Documentation index](./00-index.md)  
[Russian translation](../ru/03-violations.md)

`@modulify/validator` returns structured violations instead of built-in human-readable error messages.

This part of the API has two layers:

- raw `Violation[]` results returned by `validate(...)` and `validate.sync(...)`;
- `ViolationCollection`, a thin utility wrapper built by `collection(...)`.

## Quick Start

```typescript
import {
  collection,
  isString,
  shape,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = validate.sync({
  profile: {
    email: 42,
  },
}, shape({
  profile: shape({
    email: isString,
  }),
}))

const errors = collection(violations)
const emailErrors = errors.at(['profile', 'email'])
```

## Why Violations Are Structured

The library intentionally returns data, not presentation.

That keeps message rendering outside the validation layer and makes the same result reusable for:

- localized UI messages;
- form error state;
- API payloads;
- analytics and diagnostics;
- custom adapters and tooling.

## The `Violation` Shape

A violation contains:

- `value` - the value that failed validation;
- `path` - where the failure happened inside a nested object or array;
- `violates` - a machine-readable description of what failed.

Example:

```typescript
import type { Violation } from '@modulify/validator'

const violation: Violation = {
  value: '',
  path: ['form', 'nickname'],
  violates: {
    kind: 'assertion',
    name: 'hasLength',
    code: 'length.min',
    args: [4],
  },
}
```

## `violates`

The `violates` field contains structured failure metadata.

Important parts:

- `kind` - which layer produced the failure;
- `name` - which assertion or validator produced it;
- `code` - a semantic failure code;
- `args` - structured payload for the failure.

This allows consumers to decide how to render or transform failures later.

## `violates.kind`

`violates.kind` tells you which layer produced the failure:

- `'assertion'`
- `'validator'`
- `'runtime'`

Examples:

- `isString` failures are assertion-level;
- `shape.unknown-key` is validator-level;
- rejected async validations can surface as runtime-level failures.

## Nested Paths

`path` is a regular `PropertyKey[]`.

That means:

- object properties stay as property keys;
- array positions stay as numeric indexes;
- nested failures keep their full absolute path from the root input.

Example:

- `['profile', 'email']`
- `['items', 0, 'title']`

This is one of the reasons the library can stay adapter-friendly without stringifying field paths.

## Validation Results

`validate(...)` and `validate.sync(...)` return:

```typescript
type ValidationTuple<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

That means:

- success returns an empty violation list;
- failure returns the original input plus collected structured violations.

## `ViolationCollection`

`ViolationCollection` is a thin convenience wrapper around `Violation[]`.

It keeps the raw list model, but adds a few operations for post-processing:

- `size`
- iteration with `for...of`
- `.forEach(...)`
- `.map(...)`
- `.at(path)`
- `.tree()`

The goal is convenience, not a second error model.

## `collection(...)`

Use `collection(...)` to wrap a raw `Violation[]` result:

```typescript
const errors = collection(violations)
```

This is especially useful once validation has already happened and you want to:

- inspect one field;
- build a nested UI tree;
- group or map failure codes;
- reuse helper methods without changing the underlying data format.

## Exact Path Lookup With `.at(path)`

`.at(path)` performs exact path matching.

```typescript
const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
```

Important semantics:

- `at([])` means root-level violations;
- violations without a path are treated as root-level by the collection utilities;
- `at(['profile'])` does not include `['profile', 'email']`;
- the result is another `ViolationCollection`.

This makes path lookups predictable and easy to reason about.

## Tree View With `.tree()`

`.tree()` builds a nested machine-readable tree from the current collection.

```typescript
const tree = errors.tree()
```

This is useful when a consumer wants:

- hierarchical traversal;
- nested error rendering;
- path-aware UI state;
- a structured debugging view.

Tree nodes expose:

- `path`
- `self`
- `subtree`
- `children`
- `.at(path)`

## `ViolationTreeNode`

The tree view is shaped like this:

```typescript
type ViolationTreeNode = {
  path: readonly PropertyKey[]
  self: ViolationCollection
  subtree: ViolationCollection
  children: ReadonlyMap<PropertyKey, ViolationTreeNode>
  at(path: readonly PropertyKey[]): ViolationTreeNode | undefined
}
```

Important differences:

- `self` contains only violations exactly on the current path;
- `subtree` contains current-path violations plus all descendant violations.

## Tree Path Semantics

Tree nodes keep absolute paths.

Also:

- intermediate nodes may exist even when they have no own violations;
- they can still be useful because descendants may have failures;
- the tree is built from path arrays, not from dot-separated strings.

This keeps the structure aligned with the raw violation format.

## Practical Example

```typescript
const [ok, validated, violations] = validate.sync({
  profile: {
    email: '',
  },
}, shape({
  profile: shape({
    email: [isString],
  }),
}))

const errors = collection(violations)
const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
const codes = emailErrors.map(violation => violation.violates.code)
const tree = errors.tree()
```

From one raw violation list you can derive:

- exact-path collections;
- mapped codes;
- a nested traversal tree.

## Practical Notes

- keep `Violation[]` as the canonical transport format;
- use `collection(...)` only when the helper API improves ergonomics;
- treat `code` and `args` as your main integration points;
- keep message rendering outside the validation layer;
- prefer path-array handling over string path serialization.
