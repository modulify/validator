# Публичный API

[Оглавление документации](./00-index.md)  
[English version](../en/05-public-api.md)

Этот документ суммирует package surface `@modulify/validator` и поддерживаемые subpath exports.

Это навигационный guide о том:

- где находится каждый публичный entrypoint;
- какие группы функций экспортируются вместе;
- как выглядит результат валидации;
- какие API вынесены в отдельные subpath вроде predicates и JSON Schema export.

## Корневой пакет

Root package экспортирует:

- `validate`
- `validate.sync`
- `matches.sync`
- `meta`
- `describe`
- `custom`
- `collection`
- `ViolationCollection`
- все экспорты из `./assertions`
- все экспорты из `./combinators`

Используйте root package, когда нужен основной validation API, composed validators, metadata/introspection и violation utilities.

## Assertions и combinators

Root package включает:

- низкоуровневое создание assertions через `assert(...)`
- built-in assertions вроде `isString`, `isNumber`, `isBoolean`, `isNull`, `isEmail`, `hasLength(...)`, `oneOf(...)`
- structural combinators вроде `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`
- wrappers вроде `optional(...)`, `nullable(...)`, `nullish(...)`
- branching combinators вроде `union(...)` и `discriminatedUnion(...)`
- проверку точного значения через `exact(...)`

Это основной runtime-facing API surface библиотеки.

## Метаданные и интроспекция

Тот же root package также включает:

- `meta(...)`
- `describe(...)`
- `custom(...)`

Вместе они дают публичный machine-readable descriptor contract и metadata layer поверх него.

## Утилиты для нарушений

Root package также содержит:

- raw violation results, возвращаемые `validate(...)`
- `collection(...)`
- `ViolationCollection`

Это основные утилиты для постобработки machine-readable validation failures.

## Результат валидации

`validate(...)` и `validate.sync(...)` возвращают:

```typescript
type ValidationTuple<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

Практически это значит:

- `ok` показывает, прошла ли валидация;
- `validated` становится строго типизированным только в успешной ветке;
- `violations` пуст при успехе и содержит структурированные ошибки при неуспехе.

## Subpath predicates

Predicates доступны из:

```typescript
@modulify/validator/predicates
```

Этот subpath содержит переиспользуемые runtime/type-guard helpers и predicate combinators, например:

- `isString`
- `isNumber`
- `isRecord`
- `isArray`
- `isShape`
- `And`, `Or`, `Not`

Используйте этот subpath, когда нужны guard-style runtime checks без более высокого validation layer.

## Subpath экспорта JSON Schema

JSON Schema export доступен из:

```typescript
@modulify/validator/json-schema
```

Этот subpath содержит:

- `toJsonSchema(...)`
- `JsonSchemaExportError`

Он намеренно отделён от root package, чтобы export-specific concerns не смешивались с основным validation entrypoint.

## Как читать package surface

На верхнем уровне:

- root package = validation, combinators, metadata, violations;
- `./predicates` = standalone runtime/type-guard helpers;
- `./json-schema` = производный слой JSON Schema export.

Такое разделение сохраняет основной API понятным и в то же время позволяет держать специализированные subpath там, где это действительно нужно.
