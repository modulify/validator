# AI Reference

[Documentation index](./00-index.md)  
[Russian translation](../ru/07-ai-reference.md)

This page is a compact contract summary for AI agents, code generators, IDE tools, and human readers who want the shortest possible set of stable rules.

Treat it as the "canonical quick reference" layer above the longer guides.

## Core Model

`@modulify/validator` is organized into three runtime layers:

- predicates: runtime checks and type guards;
- assertions: machine-readable leaf failures;
- combinators: structural composition over assertions and validators.

The library does not center itself around built-in human-readable messages.

Violations are structured data first.

## Canonical Entry Points

Use the root package for:

- `validate`
- `validate.sync`
- `matches.sync`
- `meta`
- `describe`
- `custom`
- `collection`
- built-in assertions
- combinators

Use `@modulify/validator/predicates` for standalone guard-style runtime checks.

Use `@modulify/validator/json-schema` for:

- `toJsonSchema(...)`
- `JsonSchemaExportError`

## Validation Result Contract

```typescript
type ValidationTuple<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

Important consequences:

- `validate(...)` narrows the `validated` tuple item in the success branch;
- `validate(...)` does not narrow the original input variable;
- `matches.sync(...)` is the API that narrows the original variable;
- `violations` is always empty on success.

## Wrapper Semantics

- `optional(x)` accepts `undefined`
- `nullable(x)` accepts `null`
- `nullish(x)` accepts `null | undefined`

These wrappers model runtime acceptance, not UI wording.

## Shape Semantics

`shape(...)` validates plain record-like objects.

Defaults:

- unknown keys are allowed;
- unknown-key mode is `'passthrough'`;
- object-level rules are empty.

Mode switches:

- `.strict()` keeps the same fields and rules, but rejects unknown keys;
- `.passthrough()` keeps the same fields and rules, but allows unknown keys.

Structural derivations:

- `.pick(...)`
- `.omit(...)`
- `.partial(...)`
- `.extend(...)`
- `.merge(...)`

Important rule:

- structural derivations intentionally drop object-level rules;
- mode switches intentionally keep object-level rules.

## Violations Contract

Violations are machine-readable objects with:

- failed value;
- path;
- semantic subject in `violates`.

Do not depend on text parsing for downstream processing.

Prefer:

- `violations`
- `collection(...)`
- path-based lookups

Over:

- string matching;
- ad-hoc message parsing;
- field-name extraction from text.

## Metadata Contract

`meta(...)` attaches opaque machine-readable metadata to any constraint.

`describe(...)` returns a stable recursive descriptor tree.

Custom validators may participate in this contract by exposing `describe()`.

Without `describe()`, a custom validator remains opaque and usually appears as:

```typescript
{ kind: 'validator' }
```

## JSON Schema Contract

`toJsonSchema(...)` is a derived interoperability layer.

It is not the source of runtime truth.

Best-effort mode:

- default mode;
- unsupported nodes become permissive `{}` schemas;
- unsupported shape rules may be dropped with `$comment`.

Strict mode:

- throws `JsonSchemaExportError`;
- exposes `descriptor`, `reason`, and `path`.

Important mismatch:

- JSON Schema `required` is only an approximation of runtime `undefined` semantics;
- do not assume perfect semantic parity between runtime validation and exported JSON Schema.

## Canonical Patterns

Use this when you want to validate a payload:

```typescript
const [ok, validated, violations] = validate.sync(input, schema)
```

Use this when you want to narrow the original variable:

```typescript
if (matches.sync(value, schema)) {
  // value is narrowed here
}
```

Use this when you want reusable object schemas:

```typescript
const schema = shape({...}).strict()
const partial = schema.partial()
const subset = schema.pick([...])
```

Use this when another layer needs machine-readable introspection:

```typescript
const descriptor = describe(schema)
```

Use this when another system needs an export view:

```typescript
const jsonSchema = toJsonSchema(schema)
```

## Do / Do Not

Do:

- keep leaf constraints small and composable;
- treat `violations` as data, not messages;
- use `shape(...)` for reusable object contracts;
- add `describe()` to custom validators that should participate in tooling;
- use strict JSON Schema export only when lossy export is unacceptable.

Do not:

- expect `validate(...)` to narrow the original input binding;
- assume `toJsonSchema(...)` is a full mirror of runtime semantics;
- assume structural shape derivations keep object-level rules;
- rely on undocumented private internals instead of `describe(...)`;
- build downstream logic around human-readable strings.

## Best Sources Of Truth

For implementation details and edge cases, prefer this order:

1. `README.md`
2. `docs/en/*.md`
3. `tests/*.test.ts`
4. `tests/*.test-d.ts`

Tests are the most precise source for behavior that is easy to misunderstand from prose alone.
