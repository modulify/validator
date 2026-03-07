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

## Public API

### Root Exports

The root package exports:

- `validate`;
- `validate.sync`;
- `matches.sync`;
- all exports from `./assertions`;
- all exports from `./combinators`.

### Assertions And Combinators

Available from:

```typescript
import {
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

- `assert(predicate, meta, constraints?)` - low-level assertion factory;
- `discriminatedUnion(key, variants)` - validates tagged object variants via a discriminator field;
- `each(constraints)` - validates each array item and fails on non-array values;
- `shape(descriptor)` - validates object properties recursively;
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
