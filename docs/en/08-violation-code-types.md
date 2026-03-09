# Violation Code Types

[Documentation index](./00-index.md)  
[Russian translation](../ru/08-violation-code-types.md)

`@modulify/validator` exposes two related layers around machine-readable codes:

- exact literal codes in assertion descriptors and structured violations;
- an extensible global registry that can be used to derive a project-wide union of known codes.

This guide explains when each layer is useful, how they work together, and how to extend them safely.

## Quick Start

The public entrypoints are:

- `ViolationCodeEntry` - a compact contract record for a known code;
- `ViolationCodeRegistry` - an interface that collects known codes;
- `ViolationCode` - a union extracted from `keyof ViolationCodeRegistry`;
- `ViolationArgs<C>`, `ViolationKindOf<C>`, and `ViolationNameOf<C>` - code-driven utility types.

The package ships built-in keys for its own built-in violations, for example:

- `'type.string'`
- `'length.min'`
- `'shape.unknown-key'`
- `'runtime.rejection'`

So the following works out of the box:

```typescript
import type { ViolationCode } from '@modulify/validator'

const code: ViolationCode = 'type.string'
```

## Exact Codes From `describe(...)`

Built-in assertions now preserve their exact code literals in introspection.

```typescript
import {
  describe,
  hasLength,
  isString,
} from '@modulify/validator'

const stringDescriptor = describe(isString)
const lengthDescriptor = describe(hasLength({ min: 3 }))
```

In TypeScript this means:

- `stringDescriptor.code` is typed as `'type.string'`;
- `stringDescriptor.args` is typed as `[]`;
- `lengthDescriptor.code` is typed as `'length.unsupported-type'`;
- `lengthDescriptor.constraints[number].code` is typed as a concrete length-code union instead of plain `string`.

This is useful when adapters inspect descriptors and want code-aware branching without hand-written casts.

## What The Global Registry Solves

Exact literals on individual values are good for local introspection.

The global registry solves a different problem: extracting one reusable union for the whole app.

```typescript
import type { ViolationCode } from '@modulify/validator'

type AppViolationCode = ViolationCode
```

That union can be reused in:

- message dictionaries;
- analytics payload contracts;
- API error envelopes;
- UI error-state mappers;
- shared helper utilities.

## Extending `ViolationCodeRegistry`

The registry is designed for module augmentation and now stores small code contracts.

```typescript
import type { ViolationCodeEntry } from '@modulify/validator'
import '@modulify/validator'

declare module '@modulify/validator' {
  interface ViolationCodeRegistry {
    'user.email.taken': ViolationCodeEntry<'validator', 'user', readonly []>;
    'profile.password.mismatch': ViolationCodeEntry<'validator', 'shape', readonly []>;
  }
}
```

After that:

```typescript
import type { ViolationCode } from '@modulify/validator'

const codeA: ViolationCode = 'user.email.taken'
const codeB: ViolationCode = 'profile.password.mismatch'
```

This lets you define project-specific codes once and reuse the extracted union everywhere else.

If you still have older augmentations that use `never`, they continue to contribute to `ViolationCode`, but they fall back to generic `kind` / `name` / `args` typing until you migrate them to `ViolationCodeEntry`.

## Deriving Related Types From A Code

Once a code is registered with a contract entry, it becomes a key into the related type information.

```typescript
import type {
  ViolationArgs,
  ViolationKindOf,
  ViolationNameOf,
  ViolationSubject,
} from '@modulify/validator'

type PasswordArgs = ViolationArgs<'profile.password.mismatch'>
type PasswordKind = ViolationKindOf<'profile.password.mismatch'>
type PasswordName = ViolationNameOf<'profile.password.mismatch'>
type PasswordSubject = ViolationSubject<'profile.password.mismatch'>
```

That means:

- `PasswordArgs` becomes `readonly []`;
- `PasswordKind` becomes `'validator'`;
- `PasswordName` becomes `'shape'`;
- `PasswordSubject` gets the matching `kind`, `name`, `code`, and `args`.

## Using Augmented Codes In Custom Assertions

Custom assertions can keep their own explicit code literals.

```typescript
import { assert } from '@modulify/validator/assertions'

const isAvailableEmail = assert(
  (value: unknown): value is string => typeof value === 'string' && value.includes('@'),
  {
    name: 'isAvailableEmail',
    bail: true,
    code: 'user.email.taken',
  }
)
```

Then `describe(isAvailableEmail).code` is typed as `'user.email.taken'`.

This part does not depend on the global union extraction. The literal is preserved directly from the assertion definition.

## Using Augmented Codes In Shape Refinements

The same idea applies to object-level refinement issues.

```typescript
import type { ObjectShapeRefinementIssue } from '@modulify/validator'
import {
  isEmail,
  isString,
  shape,
} from '@modulify/validator'

const signUpForm = shape({
  email: [isString, isEmail],
  password: isString,
  confirmation: shape({
    password: isString,
  }),
}).refine(value => {
  if (value.password === value.confirmation.password) {
    return []
  }

  return [{
    path: ['confirmation', 'password'],
    code: 'profile.password.mismatch',
    args: [],
  }] satisfies ObjectShapeRefinementIssue<'profile.password.mismatch'>
})
```

That keeps the refinement code aligned with the same registry-backed union used elsewhere.

## A Practical Pattern For App-Level Mappers

Many consumers want a small helper layer that maps codes into rendering or transport concerns.

```typescript
import type {
  Violation,
  ViolationCode,
} from '@modulify/validator'

const labels: Partial<Record<ViolationCode, string>> = {
  'type.string': 'Expected a string',
  'length.min': 'Value is too short',
  'user.email.taken': 'Email is already taken',
}

function toLabel(violation: Violation) {
  return labels[violation.violates.code as ViolationCode] ?? violation.violates.code
}
```

You do not need to force every possible code into one giant exhaustive map. `Partial<Record<ViolationCode, ...>>` is often the most practical option.

## Built-In Union vs Explicit Literal Preservation

These two behaviors are complementary:

- built-in and augmented codes appear in the reusable `ViolationCode` union;
- explicit custom literals are preserved directly where values are created, such as `assert(...)` or typed refinement issues.

That distinction is important.

If you define a custom literal but do not augment `ViolationCodeRegistry`:

- local descriptor and violation values can still carry that exact literal;
- the global `ViolationCode` union will not include it yet.

If you augment `ViolationCodeRegistry` with `never` instead of `ViolationCodeEntry`:

- the global `ViolationCode` union will include the code;
- the code still falls back to generic `kind`, `name`, and `args` typing.

So the usual recommendation is:

1. define the custom code where the violation is produced;
2. add it to `ViolationCodeRegistry`;
3. reuse `ViolationCode` in adapters and app-level helper types.

## Related APIs

- [Metadata And Introspection](./02-metadata-and-introspection.md)
- [Violations](./03-violations.md)
- [Public API](./05-public-api.md)
