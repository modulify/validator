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
- `Guard`
- `Refinement`
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

- низкоуровневое создание assertions через `assert(...)` и `refine(...)`
- built-in guard assertions вроде `isString`, `isNumber`, `isBoolean`, `isNull`, `isEmail`, `oneOf(...)`
- built-in refinement assertions вроде `hasLength(...)`, `hasSize(...)`, `hasPattern(...)`, `startsWith(...)`, `hasValue(...)`, `multipleOf(...)`
- structural combinators вроде `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`
- wrappers вроде `optional(...)`, `nullable(...)`, `nullish(...)`
- branching combinators вроде `union(...)` и `discriminatedUnion(...)`
- проверку точного значения через `exact(...)`

Это основной runtime-facing API surface библиотеки.

Последовательные массивы assertions теперь stage-aware: совместимый кортеж вроде `[isString, hasLength({ min: 3 })]` поддерживается напрямую, а несовместимые комбинации отсекаются типовой системой.
Refinement assertions в этой модели являются staged-helper'ами, поэтому `validate(...)` и `matches.sync(...)` ожидают их после совместимого guard-а, а не в одиночку.

Структурные validators вроде `each(...)` сбрасывают assertion stage. Перед следующим refinement нужен новый совместимый guard, например `[each(isString), isDefined, hasLength({ min: 2 })]`.

### Встроенные проверки значений

Эти проверки доступны как assertions из root и `./assertions`, а как boolean type guards — из `./predicates`.

| Проверка | Допустимые значения | Код нарушения |
| --- | --- | --- |
| `isFiniteNumber` | Числа без `NaN` и бесконечностей | `number.finite` |
| `isInteger` | Целые числа | `number.integer` |
| `isSafeInteger` | Целые числа в безопасном диапазоне JavaScript | `number.safe-integer` |
| `isValidDate` | Экземпляры `Date` с корректным timestamp | `date.valid` |
| `isError` | Экземпляры `Error`, включая подклассы | `type.error` |
| `isRegExp` | Экземпляры `RegExp` | `type.regexp` |
| `isPromiseLike` | Объекты или функции с вызываемым свойством `then` | `type.promise-like` |

`isNumber` по-прежнему принимает бесконечности, а `isDate` — невалидные экземпляры `Date`. Для их отклонения используйте более строгие проверки. `isPromiseLike` проверяет наличие вызываемого `then`, не вызывая его и не проверяя тип результата.

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
type ValidationResult<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

Практически это значит:

- `ok` показывает, прошла ли валидация;
- `validated` становится строго типизированным только в успешной ветке;
- `violations` пуст при успехе и содержит структурированные ошибки при неуспехе.
- `validate(...)` остаётся основным async-first entrypoint;
- `validate.sync(...)` явно выбрасывает ошибку при async validators и async object-level rules из `shape(...).refine(...)`.

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

В `isShape({ name: [isString, false] })` optional-поле может отсутствовать,
но присутствующее значение всегда проверяется предикатом. Это относится и к
явному `undefined`: чтобы разрешить его, используйте `Or(isString, isUndefined)`.
Shorthand `name: isString` и кортеж `[isString, true]` задают обязательное поле.
Наличие поля проверяется через `in`, включая свойства из цепочки прототипов.

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
