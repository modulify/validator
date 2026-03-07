# <img src="./logo.png" alt="Logo" width="36" /> `@modulify/validator`

[![npm version](https://img.shields.io/npm/v/@modulify/validator.svg)](https://www.npmjs.com/package/@modulify/validator)
[![codecov](https://codecov.io/gh/modulify/validator/branch/main/graph/badge.svg)](https://codecov.io/gh/modulify/validator)
[![Tests Status](https://github.com/modulify/validator/actions/workflows/tests.yml/badge.svg)](https://github.com/modulify/validator/actions)

`@modulify/validator` is a small TypeScript validation library built around three separate layers:

- predicates for runtime checks and type narrowing;
- assertions for machine-readable validation failures;
- runners for recursive validation of arrays and object structures.

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
- recursive validation runners;
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
  HasProperties,
  hasLength,
  isDefined,
  isString,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = await validate({
  form: {
    nickname: '',
    password: '',
  },
}, HasProperties({
  form: [
    isDefined,
    HasProperties({
      nickname: [isString, hasLength({ min: 4 })],
      password: [isString, hasLength({ min: 6 })],
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
}, HasProperties({
  form: [
    isDefined,
    HasProperties({
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
  HasProperties,
  isDefined,
  isString,
  validate,
} from '@modulify/validator'

const schema = HasProperties({
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
- runners answer: where should validation continue recursively?

In the current API this usually looks like:

- leaf checks with assertions such as `isString`, `isDefined`, `hasLength`, `oneOf`;
- recursive composition with `HasProperties(...)` and `Each(...)`;
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
- all exports from `./runners`.

### Assertions

Available from:

```typescript
import {
  assert,
  hasLength,
  isBoolean,
  isDate,
  isDefined,
  isEmail,
  isNull,
  isNumber,
  isString,
  isSymbol,
  oneOf,
} from '@modulify/validator'
```

Members:

- `assert(predicate, meta, constraints?)` - low-level assertion factory;
- `hasLength(options)` - length checks for strings and arrays;
- `isBoolean`;
- `isDate`;
- `isDefined`;
- `isEmail`;
- `isNull`;
- `isNumber`;
- `isString`;
- `isSymbol`;
- `oneOf(values, options?)`.

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

This layer contains reusable runtime/type-guard helpers and combinators.

### Runners

Available from:

```typescript
import {
  Each,
  HasProperties,
} from '@modulify/validator'
```

Members:

- `Each(constraints)` - validates each array item and fails on non-array values;
- `HasProperties(descriptor)` - validates object properties recursively.

## Notes

- Assertions return structured metadata instead of messages.
- Predicates are intended to stay useful independently from the validation layer.
- Runners are responsible for traversal; assertions are responsible for leaf-level checks.
- The library is easier to use when one stable violation format is kept across the whole project.
- `validate(...)` narrows the `validated` tuple item, not the original input variable.
- To narrow the original variable in sync code, use `matches.sync(...)`.
