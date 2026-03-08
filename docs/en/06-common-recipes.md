# Common Recipes

[Documentation index](./00-index.md)  
[Russian translation](../ru/06-common-recipes.md)

This guide answers the practical question:

> Which part of `@modulify/validator` should I use for task `X`?

It is intentionally recipe-oriented. Use it when you already understand the project direction and want a fast path to a concrete implementation.

## Pick The Right Layer First

Use this quick rule of thumb:

- use `@modulify/validator/predicates` when you only need runtime checks and type guards;
- use built-in assertions such as `isString`, `isDefined`, `hasLength(...)`, `oneOf(...)` when you want machine-readable failures;
- use combinators such as `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`, `union(...)`, `discriminatedUnion(...)` when validation becomes structural;
- use `meta(...)` and `describe(...)` when another layer needs stable machine-readable descriptors;
- use `toJsonSchema(...)` only when you need an interoperability/export view, not as the source of runtime truth.

## Validate An API Payload

Use `shape(...)` plus leaf assertions.

```typescript
import {
  hasLength,
  isDefined,
  isString,
  shape,
  validate,
} from '@modulify/validator'

const createUser = shape({
  email: [isDefined, isString],
  password: [isString, hasLength({ min: 8 })],
}).strict()

const [ok, validated, violations] = validate.sync(input, createUser)
```

Practical pattern:

- use `.strict()` for request payloads when unknown keys should be rejected;
- keep leaf checks small and composable;
- use the `validated` tuple item inside the success branch;
- use `violations` as structured data for API responses, logs, or UI mapping.

## Narrow An Existing Variable In Sync Code

Use `matches.sync(...)`.

```typescript
import {
  isDefined,
  isString,
  matches,
} from '@modulify/validator'

const value: unknown = source()

if (matches.sync(value, [isDefined, isString])) {
  value.toUpperCase()
}
```

Use this when you want to narrow the original variable itself.

Do not use `validate.sync(...)` for this purpose if your main goal is narrowing the original variable. `validate.sync(...)` narrows the `validated` tuple item, not the original input binding.

## Model Optional, Nullable, And Nullish Fields

Use the wrapper that matches your runtime meaning:

- `optional(x)` means `undefined` is accepted;
- `nullable(x)` means `null` is accepted;
- `nullish(x)` means both `null` and `undefined` are accepted.

```typescript
const profile = shape({
  nickname: optional(isString),
  middleName: nullable(isString),
  bio: nullish(isString),
})
```

Practical rule:

- use `optional(...)` for omitted or unset fields;
- use `nullable(...)` when `null` is a meaningful explicit value;
- use `nullish(...)` only when both cases are intentionally allowed.

## Reuse One Shape In Multiple Views

Build one base shape, then derive from it.

```typescript
import {
  exact,
  isString,
  optional,
  shape,
} from '@modulify/validator'

const account = shape({
  id: isString,
  nickname: optional(isString),
  role: exact('admin'),
}).strict()

const publicAccount = account.pick(['id', 'nickname'])
const editableAccount = account.partial()
const adminAccount = account.extend({ team: isString })
```

Use this pattern when one domain object appears in:

- API payloads;
- form state;
- internal service boundaries;
- public views with a reduced field set.

Remember that structural derivations such as `pick()`, `omit()`, `partial()`, `extend()`, and `merge()` intentionally drop object-level rules.

## Attach UI Metadata Without Coupling UI To Validation

Use `meta(...)` on any constraint.

```typescript
import {
  isString,
  meta,
  shape,
} from '@modulify/validator'

const registration = shape({
  email: meta(isString, {
    title: 'Email',
    description: 'Primary login address',
  }),
})
```

This is useful when a separate layer needs:

- field titles;
- placeholders or display hints;
- domain-specific metadata for rendering;
- descriptor-driven tooling.

Only some metadata keys are later mapped into JSON Schema. Other keys remain library-specific.

## Build Field Error State For Forms

Use `collection(...)` on top of `violations`.

```typescript
import {
  collection,
  isString,
  shape,
  validate,
} from '@modulify/validator'

const schema = shape({
  profile: shape({
    email: isString,
  }),
})

const [ok, validated, violations] = validate.sync(input, schema)
const errors = collection(violations)

const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
```

This is the recommended shape when you need exact path lookups instead of string parsing.

## Add Cross-Field Rules

Use `fieldsMatch(...)` for common confirmation cases and `refine(...)` for everything else.

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).fieldsMatch(['password', 'confirmPassword'])
```

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

Choose `fieldsMatch(...)` when the rule is exactly equality between two selectors.

Choose `refine(...)` when:

- more than two fields participate;
- the rule is domain-specific;
- the output path needs custom control;
- you want a custom descriptor for introspection.

## Write A Custom Validator That Tooling Can Understand

Use `custom(...)` and provide `describe()` if the validator should participate in public introspection.

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
      kind: 'stringFormat' as const,
      format: 'iso-date' as const,
    }
  },
})
```

Without `describe()`, the validator remains intentionally opaque to `describe(...)` and `toJsonSchema(...)`.

## Export JSON Schema Safely

Use `toJsonSchema(...)` in two different modes depending on the consumer.

```typescript
import { toJsonSchema } from '@modulify/validator/json-schema'

const schema = toJsonSchema(profile)
const strictSchema = toJsonSchema(profile, { mode: 'strict' })
```

Use best-effort mode when:

- external consumers can tolerate permissive `{}` nodes;
- a partial export is better than no export;
- you want the broadest schema view.

Use strict mode when:

- lossy export would be misleading;
- JSON Schema is part of a contract;
- unsupported runtime semantics must fail loudly.

## Recommended Reading Order

If you are new to the library, the shortest useful reading path is:

1. `README.md`
2. `01-shape-api.md`
3. `03-violations.md`
4. `02-metadata-and-introspection.md`
5. `04-json-schema-export.md`
6. `07-ai-reference.md` when you want the compact contract summary
