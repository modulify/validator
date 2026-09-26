# Migrating From 0.2.1

[Documentation index](./00-index.md)  
[Russian translation](../ru/09-migration.md)

This guide describes the unreleased changes after `0.2.1`.

## Object-Level Refinements

`shape(...).refine(...)` is async-first even when its callback returns a plain value.
Use `shape(...).refine.sync(...)` for rules used by `validate.sync(...)`,
`matches.sync(...)`, or `shape.check(...)`.

```typescript
const profile = shape({ password: isString, confirmation: isString })
  .refine.sync(value => value.password === value.confirmation ? null : {
    code: 'profile.password.mismatch',
  })
```

Use `.refine(...)` with `await validate(...)` for asynchronous rules.

## Staged Assertions

Guard assertions establish a domain; refinements check properties inside it:

```typescript
validate.sync('name', [isString, hasLength({ min: 3 })])
validate.sync(4, [isInteger, multipleOf(2)])
```

Replace standalone refinements such as `validate.sync(value, hasLength(...))`
with a compatible guard followed by the refinement. Incompatible combinations,
such as `[isNumber, hasLength(...)]`, are rejected by TypeScript.

Structural validators reset the assertion stage. To refine the outer array after
checking its elements, use `[each(isString), isDefined, hasLength({ min: 2 })]`.

## Public Type Names

The old names have no compatibility aliases. Update imports and annotations:

| Old name | Current name |
| --- | --- |
| `ValidationTuple` | `ValidationResult` |
| `InferMaybeManyViolations` | `InferViolations` |
| `ObjectDescriptor` | `ShapeDescriptor` |
| `InferObjectDescriptor` | `InferShape` |
| `PartialObjectDescriptor` | `PartialShapeDescriptor` |
| `MergeObjectDescriptors` | `MergeShapeDescriptors` |
| `ObjectShapeFieldSelector` | `ShapeFieldSelector` |
| `ObjectShapeRefinement` / `ObjectShapeAsyncRefinement` | `ShapeRefinement` |
| `ObjectShapeRefinementSync` / `ObjectShapeSyncRefinement` | `SyncShapeRefinement` |
| `ObjectShapeRefinementIssue` | `ShapeRefinementViolationInput` |
| `ObjectShapeRefineMethod` | `ShapeRefineMethod` |
| `ObjectShapeRefineMethodSync` | `ShapeRefineMethodSync` |
| `DescribeMaybeMany` | `DescribeConstraints` |
| `DescribeObjectDescriptor` | `DescribeShapeDescriptor` |
| `AssertionDescriptorConstraint` | `AssertionConstraintDescriptor` |
| `ConstraintDescriptorBase` | `BaseConstraintDescriptor` |
| `ValidatorDescriptor` | `OpaqueValidatorDescriptor` |
| `GenericObjectShapeRuleDescriptor` | `SyncObjectShapeRuleDescriptor` |

## Optional Predicate Fields

`isShape({ name: [isString, false] })` permits an absent `name`, but rejects
`{ name: 2 }` and `{ name: undefined }`. To allow explicit `undefined`, use
`[Or(isString, isUndefined), false]`. Required fields must be present even when
their predicate accepts `undefined`.

## Package Consumers

The public root and subpath exports support ESM, CommonJS, and strict TypeScript
with NodeNext or Bundler resolution. Import from package entrypoints rather than
internal files in `dist/`.
