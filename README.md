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

`shape(...)` is the reusable object-shape API. It validates nested record-like objects and exposes small immutable helpers such as `strict()`, `pick()`, `omit()`, `partial()`, `extend()`, `merge()`, `refine()`, and `fieldsMatch(...)`.

```typescript
import {
  isString,
  optional,
  shape,
  validate,
} from '@modulify/validator'

const profile = shape({
  id: isString,
  nickname: optional(isString),
})

const [ok] = validate.sync({
  id: 'u1',
  nickname: 'neo',
}, profile)
```

Detailed guides:

- [Shape API Guide](./docs/en/01-shape-api.md)

## Metadata And Introspection

`meta(...)` attaches machine-readable metadata to any constraint, and `describe(...)` returns a stable recursive descriptor tree for built-in constraints and compatible custom validators.

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

Detailed guides:

- [Metadata And Introspection Guide](./docs/en/02-metadata-and-introspection.md)
- [Violation Code Types Guide](./docs/en/08-violation-code-types.md)

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

## Violations

`validate(...)` returns machine-readable `Violation[]`, and `collection(...)` can wrap that list into a small helper API for exact path lookups and tree traversal.

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
```

Detailed guides:

- [Violations Guide](./docs/en/03-violations.md)
- [Violation Code Types Guide](./docs/en/08-violation-code-types.md)

## JSON Schema Export

`toJsonSchema(...)` derives a JSON Schema view from the same public descriptor tree returned by `describe(...)`.

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

Detailed guides:

- [JSON Schema Export Guide](./docs/en/04-json-schema-export.md)

## Public API

The detailed public API guide covers root exports, specialized subpath exports, the validation result tuple, and how the package surface is split between validation, predicates, violations, metadata, and JSON Schema export.

Detailed guides:

- [Public API Guide](./docs/en/05-public-api.md)

## Recipes And AI Reference

Two additional guides are useful when you want faster practical navigation instead of reading the whole conceptual set front to back.

- [Common Recipes](./docs/en/06-common-recipes.md) - task-oriented examples for payload validation, wrapper choice, reusable shapes, form error mapping, and JSON Schema export.
- [AI Reference](./docs/en/07-ai-reference.md) - compact contract summary for agents, tooling, and quick semantic lookup.

## Notes

- Assertions return structured metadata instead of messages.
- Combinators are thin schema-building helpers layered on top of assertions and validators; `each` and `shape` are structural combinators in this model.
- Predicates are intended to stay useful independently from the validation layer.
- The library is easier to use when one stable violation format is kept across the whole project.
- `validate(...)` narrows the `validated` tuple item, not the original input variable.
- To narrow the original variable in sync code, use `matches.sync(...)`.

## Translations

- [Russian](./docs/ru/README.md)
