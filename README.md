# <img src="./logo.png" alt="Logo" width="36" /> `@modulify/validator`

[![npm version](https://img.shields.io/npm/v/@modulify/validator.svg)](https://www.npmjs.com/package/@modulify/validator)
[![codecov](https://codecov.io/gh/modulify/validator/branch/main/graph/badge.svg)](https://codecov.io/gh/modulify/validator)
[![Tests Status](https://github.com/modulify/validator/actions/workflows/tests.yml/badge.svg)](https://github.com/modulify/validator/actions)

`@modulify/validator` is a small TypeScript validation library built around three separate layers:

- predicates for runtime checks and type narrowing;
- assertions for machine-readable validation failures;
- combinators for schema composition, including structural recursion over arrays and objects.

The project is intentionally centered on structured metadata instead of built-in human-readable error messages.

## What This Project Is

This library is designed for cases where you want to:

- keep simple type guards useful on their own;
- validate nested data recursively;
- receive structured violation objects instead of text messages;
- decide later how those violations should be rendered or transformed.

Typical outputs of the validation layer can be mapped into:

- localized error messages;
- form field error state;
- API error payloads;
- analytics/debug data;
- custom UI or virtual DOM nodes.

## Idea

The project separates two concerns that are often mixed in one abstraction.

### Predicates

Predicates are small runtime checks that also act as TypeScript type guards.

They answer questions like:

- is this value a string?
- is this value an object with a specific shape?
- does this value satisfy a basic logical condition?

This layer is meant to stay simple and independently useful even outside the validation pipeline.

### Validators And Assertions

Assertions are checks that can return a violation with structured metadata.

Instead of generating a text message, an assertion returns data that describes:

- what failed;
- where it failed;
- which semantic code failed;
- which arguments or bounds were involved.

That keeps presentation outside the library.

### Why This Exists Alongside `zod`-Like Libraries

Libraries such as `zod`, `yup`, and similar schema-oriented tools are well known and solve a large class of validation problems well.

The goal of this project is different.

It is not primarily trying to be:

- a schema-definition DSL;
- a form library with built-in message semantics;
- an all-in-one parsing and presentation layer.

Instead, this project focuses on:

- small predicates for narrowing;
- a separate assertion layer for diagnostics;
- composable schema combinators;
- machine-readable violations that consumers can map however they want.

A short summary of the intended direction is:

> Type-safe predicates for narrowing, and validators for machine-readable diagnostics.

Or even shorter:

> No messages, only meaning.

## Installation

Using `yarn`:

```bash
yarn add @modulify/validator
```

Using `npm`:

```bash
npm install @modulify/validator --save
```

## Quick Example

```typescript
import {
  each,
  shape,
  exact,
  hasLength,
  isDefined,
  isString,
  nullable,
  optional,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = await validate({
  form: {
    nickname: undefined,
    title: null,
    password: '',
    role: 'admin',
  },
}, shape({
  form: [
    isDefined,
    shape({
      nickname: optional([isString, hasLength({ min: 4 })]),
      title: nullable(isString),
      password: [isString, hasLength({ min: 6 })],
      role: exact('admin'),
    }),
  ],
}))

if (ok) {
  validated.form.nickname.toUpperCase()
} else {
  console.log(violations)
}
```

Synchronous validation:

```typescript
const [ok, validated, violations] = validate.sync({
  form: {
    nickname: '',
    password: '',
  },
}, shape({
  form: [
    isDefined,
    shape({
      nickname: [isString, hasLength({ min: 4 })],
      password: [isString, hasLength({ min: 6 })],
    }),
  ],
}))

if (ok) {
  validated.form.password.toUpperCase()
}
```

Sync narrowing of the original variable:

```typescript
import {
  isDefined,
  isString,
  matches,
} from '@modulify/validator'

const value: unknown = 'nickname'

if (matches.sync(value, [isDefined, isString])) {
  value.toUpperCase()
}
```

Typed success branch directly from `validate`:

```typescript
import {
  shape,
  isDefined,
  isString,
  validate,
} from '@modulify/validator'

const schema = shape({
  name: [isDefined, isString],
})

const [ok, validated, violations] = await validate({ name: 'Kirill' }, schema)

if (ok) {
  validated.name.toUpperCase()
} else {
  console.log(violations)
}
```

## Shape API

`shape(...)` is the reusable object shape API. It keeps the same validation kernel as before, but now also exposes immutable helper methods for deriving related shapes.

```typescript
import {
  exact,
  isString,
  optional,
  validate,
  shape,
} from '@modulify/validator'

const profile = shape({
  id: isString,
  nickname: optional(isString),
  role: exact('admin'),
})

const editableProfile = profile.partial()
const publicProfile = profile.pick(['id', 'nickname'])
const strictProfile = profile.strict()

const [ok] = validate.sync({
  id: 'u1',
  nickname: 'neo',
}, editableProfile)
```

Shapes expose:

- `descriptor` - the current descriptor for introspection and reuse;
- `unknownKeys` - either `'passthrough'` or `'strict'`;
- `refine(rule)` - adds a sync object-level rule that runs after the base shape passes;
- `fieldsMatch([left, right])` - a thin helper for common confirmation-field checks;
- `strict()` - rejects extra keys with `shape.unknown-key` violations on the extra key path;
- `passthrough()` - explicitly allows extra keys;
- `pick(keys)` and `omit(keys)` - derive subsets without rebuilding descriptors manually;
- `partial()` - wraps every field in `optional(...)`;
- `extend(descriptor)` - adds or overrides fields;
- `merge(shape)` - merges another shape into the current one.

Notes:

- `shape(...)` defaults to `'passthrough'`.
- `refine(...)` is sync-only in this first step.
- Object-level rules run only after the current shape has validated successfully as an object, including field checks and strict unknown-key checks.
- `refine(...)` returns machine-readable shape violations with `violates.kind === 'validator'` and `violates.name === 'shape'`.
- `pick`, `omit`, `partial`, `extend`, and `merge` preserve the current unknown-keys mode of the receiver.
- `strict()` and `passthrough()` keep object-level rules because the descriptor stays the same.
- `pick()`, `omit()`, `partial()`, `extend()`, and `merge()` drop object-level rules intentionally because generic refinements are opaque and may reference fields that no longer exist.
- `merge(...)` keeps the receiver mode and lets the right-hand schema override overlapping fields.
- `partial()` follows the current `shape(...)` model where an omitted key and a key with value `undefined` are treated the same during validation.

## Object-Level Rules

`shape(...)` can also express cross-field invariants without adding a second schema system.

```typescript
import {
  isString,
  shape,
  validate,
} from '@modulify/validator'

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

const [ok, validated, violations] = validate.sync({
  password: 'secret',
  confirmPassword: 'different',
}, registration)
```

`refine(...)` rules are intentionally thin:

- return `[]`, `null`, or `undefined` when the rule passes;
- return one issue or an array of issues when it fails;
- `path` is relative to the current object shape and defaults to `[]`;
- `value` is optional and defaults to the current object value at that relative path;
- `code` stays fully machine-readable so application code can decide how to render it.

When a rule needs to be more useful for tooling, you can attach a compact descriptor without serializing the callback itself:

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
    }]
}, {
  kind: 'passwordConfirmation',
  metadata: {
    fields: ['password', 'confirmPassword'],
  },
})
```

For the common confirmation-field case there is a small helper:

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).fieldsMatch(['password', 'confirmPassword'])
```

It also accepts nested path selectors when fields live at different levels:

```typescript
const registration = shape({
  password: isString,
  confirm: shape({
    password: isString,
  }),
}).fieldsMatch([['password'], ['confirm', 'password']])
```

You can also mix the short top-level form with a nested selector:

```typescript
const registration = shape({
  password: isString,
  confirm: shape({
    password: isString,
  }),
}).fieldsMatch(['password', ['confirm', 'password']])
```

## Metadata And Introspection

`meta(...)` attaches machine-readable metadata to any assertion or validator without changing validation semantics.

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
    placeholder: 'name@example.com',
  }),
  nickname: optional(isString),
}).strict(), {
  title: 'Registration form',
})

const node = describe(registration)
```

`describe(...)` returns a recursive machine-readable descriptor tree for built-in constraints and for custom validators that expose a public `describe()` method.

Examples of `kind` values:

- `'assertion'` for leaf assertions;
- `'allOf'` for array slots that chain multiple constraints in sequence;
- `'optional'`, `'nullable'`, `'nullish'` for wrappers;
- `'shape'`, `'each'`, `'tuple'`, `'record'` for structural validators;
- `'union'` and `'discriminatedUnion'` for branching validators;
- `'validator'` as a generic fallback for custom validators without built-in structural instrumentation.

That tree is intentionally adapter-oriented rather than presentation-oriented. A small form adapter can walk it and collect widget hints without knowing anything about runtime validation internals:

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

This is especially useful together with schema-adjacent metadata:

```typescript
import {
  describe,
  isString,
  meta,
  shape,
} from '@modulify/validator'

const profile = meta(shape({
  email: meta(isString, { widget: 'email' }),
  name: meta(isString, { widget: 'text' }),
}), {
  title: 'Profile form',
})

const node = describe(profile)
```

Shape descriptors include:

- `metadata` attached with `meta(...)`;
- `unknownKeys` with `'passthrough'` or `'strict'`;
- `fields` with child descriptors per object field;
- `rules` with lightweight machine-readable summaries of object-level rules such as `refine(...)` and `fieldsMatch(...)`.

Custom validators can participate in the same layer through `custom(...)` plus a public `describe()` method:

```typescript
import {
  custom,
  describe,
  meta,
} from '@modulify/validator'

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

const node = describe(meta(isoDate, { title: 'Published at' }))
```

Current boundaries of this layer:

- no built-in message rendering or i18n;
- no JSON Schema exporter yet;
- no metadata inheritance across the schema tree;
- no separate schema DSL alongside the existing runtime constraints;
- no serialization of runtime callbacks from `refine(...)`.

## Mental Model

A practical way to think about the library is:

- predicates answer: does this value satisfy condition `X`?
- assertions answer: if not, what exactly failed?
- combinators answer: how should constraints be combined into a bigger schema, including recursive object and array traversal?

In the current API this usually looks like:

- leaf checks with assertions such as `isString`, `isDefined`, `hasLength`, `oneOf`;
- schema composition with combinators such as `exact`, `optional`, `nullable`, `nullish`, `shape(...)`, `each(...)`;
- typed validation through `validate(...)` or `validate.sync(...)`;
- narrowing of the original sync variable through `matches.sync(...)`.

## Violation Shape

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

Fields:

- `value` - the value that failed validation;
- `path` - full path to the value inside a nested structure;
- `violates.kind` - which layer produced the violation: assertion, validator, or runtime;
- `violates.name` - which assertion or validator produced it;
- `violates.code` - the semantic failure code;
- `violates.args` - structured metadata for that failure.

The important part is that a violation is data, not presentation.

## Violation Collections

`Violation[]` stays the core result format, but you can now wrap it into a small utility layer for post-processing:

```typescript
import {
  collection,
  isString,
  shape,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = validate.sync({
  profile: {
    email: '',
  },
}, shape({
  profile: shape({
    email: isString,
  }),
}))

const errors = collection(violations)

const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
const codes = emailErrors.map(violation => violation.violates.code)
const tree = errors.tree()
```

`ViolationCollection` is intentionally thin:

- `size` gives the current collection size;
- it supports `for...of`, `.forEach(...)`, and `.map(...)`;
- `.at(path)` does exact path matching and returns another `ViolationCollection`;
- `.tree()` builds a nested machine-readable tree without serializing paths into strings.

Path semantics:

- `at([])` means root-level violations;
- violations without `path` are treated as root-level by the collection utilities;
- `at(['profile'])` does not include `['profile', 'email']`;
- tree node paths are absolute;
- intermediate tree nodes may exist even if they have no own violations, because they can still have descendant violations in `subtree`.

Tree nodes have this shape:

```typescript
type ViolationTreeNode = {
  path: readonly PropertyKey[]
  self: ViolationCollection
  subtree: ViolationCollection
  children: ReadonlyMap<PropertyKey, ViolationTreeNode>
  at(path: readonly PropertyKey[]): ViolationTreeNode | undefined
}
```

## Public API

### Root Exports

The root package exports:

- `validate`;
- `validate.sync`;
- `matches.sync`;
- `meta`;
- `describe`;
- `custom`;
- `collection`;
- `ViolationCollection`;
- all exports from `./assertions`;
- all exports from `./combinators`.

### Assertions And Combinators

Available from:

```typescript
import {
  describe,
  custom,
  discriminatedUnion,
  assert,
  each,
  shape,
  exact,
  hasLength,
  isBoolean,
  isDate,
  isDefined,
  isEmail,
  isNull,
  isNumber,
  isString,
  isSymbol,
  meta,
  nullable,
  oneOf,
  optional,
  nullish,
  record,
  tuple,
  union,
} from '@modulify/validator'
```

Members:

- `describe(constraint)` - returns a stable recursive machine-readable descriptor for built-in constraints and public custom descriptors;
- `custom(validator)` - preserves the exact type shape of a custom validator, including an optional public `describe()` method;
- `assert(predicate, meta, constraints?)` - low-level assertion factory;
- `discriminatedUnion(key, variants)` - validates tagged object variants via a discriminator field;
- `each(constraints)` - validates each array item and fails on non-array values;
- `shape(descriptor)` - validates object properties recursively and returns a reusable object shape with immutable helper methods;
- `exact(value)` - exact value assertion built on top of predicate semantics;
- `hasLength(options)` - length checks for strings and arrays;
- `isBoolean`;
- `isDate`;
- `isDefined`;
- `isEmail`;
- `isNull`;
- `isNumber`;
- `isString`;
- `isSymbol`;
- `meta(constraint, metadata)` - returns a cloned constraint annotated with machine-readable metadata;
- `nullable(constraints)` - accepts `null` or validates the nested constraints;
- `nullish(constraints)` - accepts `null` or `undefined` or validates the nested constraints;
- `oneOf(values, options?)`.
- `optional(constraints)` - accepts `undefined` or validates the nested constraints.
- `record(constraints)` - validates dynamic object keys against shared constraints;
- `tuple([constraints...])` - validates fixed-length positional tuples.
- `union([constraints...])` - validates a value against multiple alternative branches.

### Validate Result

`validate(...)` returns a tuple:

```typescript
type ValidationTuple<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

That means:

- `ok` tells whether validation passed;
- `validated` becomes strongly typed only in the success branch;
- `violations` is empty on success and contains structured errors on failure.

The same contract is used by `validate.sync(...)`.

### Predicates

Available from:

```typescript
import {
  And,
  Not,
  Or,
  hasProperty,
  isArray,
  isBoolean,
  isDate,
  isEmail,
  isExact,
  isNull,
  isNumber,
  isObject,
  isRecord,
  isShape,
  isString,
  isSymbol,
  isUndefined,
} from '@modulify/validator/predicates'
```

This layer contains reusable runtime/type-guard helpers and predicate combinators.

## Notes

- Assertions return structured metadata instead of messages.
- Combinators are thin schema-building helpers layered on top of assertions and validators; `each` and `shape` are structural combinators in this model.
- Predicates are intended to stay useful independently from the validation layer.
- The library is easier to use when one stable violation format is kept across the whole project.
- `validate(...)` narrows the `validated` tuple item, not the original input variable.
- To narrow the original variable in sync code, use `matches.sync(...)`.
