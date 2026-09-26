# Миграция с 0.2.1

[Индекс документации](./00-index.md)  
[English](../en/09-migration.md)

Здесь описаны ещё не выпущенные изменения после `0.2.1`.

## Правила уровня объекта

`shape(...).refine(...)` стал async-first, даже если callback возвращает обычное
значение. Для правил, используемых через `validate.sync(...)`, `matches.sync(...)`
или `shape.check(...)`, нужен `shape(...).refine.sync(...)`.

```typescript
const profile = shape({ password: isString, confirmation: isString })
  .refine.sync(value => value.password === value.confirmation ? null : {
    code: 'profile.password.mismatch',
  })
```

Асинхронные правила `.refine(...)` используются с `await validate(...)`.

## Последовательные assertions

Guard задаёт область допустимых значений, refinement проверяет свойства внутри неё:

```typescript
validate.sync('name', [isString, hasLength({ min: 3 })])
validate.sync(4, [isInteger, multipleOf(2)])
```

Замените самостоятельные refinements вроде `validate.sync(value, hasLength(...))`
на совместимый guard и refinement после него. Несовместимые сочетания, например
`[isNumber, hasLength(...)]`, отклоняются TypeScript.

Структурные validators сбрасывают assertion stage. Для проверки длины внешнего
массива после проверки элементов используйте
`[each(isString), isDefined, hasLength({ min: 2 })]`.

## Имена публичных типов

Совместимых aliases для прежних имён нет. Обновите imports и аннотации:

| Прежнее имя | Новое имя |
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

## Optional-поля в predicates

`isShape({ name: [isString, false] })` разрешает отсутствие `name`, но отклоняет
`{ name: 2 }` и `{ name: undefined }`. Для явного `undefined` используйте
`[Or(isString, isUndefined), false]`. Обязательное поле должно присутствовать,
даже если его предикат принимает `undefined`.

## Потребители пакета

Публичные root и subpath exports поддерживают ESM, CommonJS и strict TypeScript
с разрешением модулей NodeNext или Bundler. Используйте package entrypoints,
а не внутренние файлы `dist/`.
