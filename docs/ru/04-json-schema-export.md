# Экспорт JSON Schema

[Оглавление документации](./00-index.md)  
[English version](../en/04-json-schema-export.md)

`@modulify/validator/json-schema` предоставляет тонкий слой экспорта в JSON Schema поверх публичного descriptor contract.

Это именно derivation layer, а не вторая schema model. Exporter читает публичные descriptors и строит по ним представление в виде JSON Schema.

## Быстрый старт

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

## Ментальная модель

Поток экспорта специально устроен просто:

1. validators публикуют публичные descriptors через `describe(...)`;
2. `toJsonSchema(...)` строит JSON Schema поверх этих descriptors;
3. unsupported или opaque nodes либо пропускаются в best-effort режиме, либо приводят к ошибке в strict режиме.

Это разделение важно, потому что:

- runtime validation остаётся runtime-first;
- поведение exporter-а остаётся явным;
- custom tooling может опираться на один публичный introspection contract.

## Точка входа

JSON Schema export импортируется из отдельного subpath:

```typescript
import {
  JsonSchemaExportError,
  toJsonSchema,
} from '@modulify/validator/json-schema'
```

Root package намеренно не делает реэкспорт этого API.

## Поддерживаемые built-in mappings

Exporter покрывает built-in descriptor set, который уже участвует в публичной introspection.

### Базовые assertions

Практические mappings включают:

- `isString` -> `type: 'string'`
- `isNumber` -> `type: 'number'`
- `isBoolean` -> `type: 'boolean'`
- `isNull` -> `type: 'null'`
- `isEmail` -> `type: 'string'` и `format: 'email'`
- `exact(...)` -> `const`
- `oneOf(...)` -> `enum`
- `hasLength(...)` -> ограничения длины для строк и массивов

### Обёртки

Поддерживаются wrappers:

- `optional(...)`
- `nullable(...)`
- `nullish(...)`

`optional(...)` влияет на вычисление object `required`. `nullable(...)` и `nullish(...)` экспортируются как union с `null`.

### Структурные combinators

Поддерживаются structural mappings:

- `shape(...)`
- `each(...)`
- `tuple(...)`
- `record(...)`

### Ветвящиеся combinators

Поддерживаются branching mappings:

- `union(...)`
- `discriminatedUnion(...)`

### Последовательные slots

Массивы constraints в одном slot экспортируются как JSON Schema `allOf`.

## Преобразование object schemas

`shape(...)` экспортируется как JSON Schema object с:

- `type: 'object'`
- `properties`
- `required`
- `additionalProperties`

Поведение unknown keys отображается так:

- `.strict()` -> `additionalProperties: false`
- default или `.passthrough()` -> `additionalProperties: true`

## `required` и `undefined`

Одна из важных границ касается наличия объектных полей.

Runtime layer во многих практических сценариях рассматривает как один и тот же случай:

- отсутствие ключа;
- и ключ со значением `undefined`;

особенно вокруг `optional(...)` и derived helpers вроде `partial()`.

JSON Schema моделирует это не так. Поэтому exporter аппроксимирует наличие полей через JSON Schema `required`, а не обещает точную semantic parity.

Это сделано намеренно: экспорт нужно воспринимать как interoperability layer, а не как обещание полной эквивалентности runtime semantics и JSON Schema.

## Преобразование metadata

Exporter не копирует всю metadata в JSON Schema автоматически.

Вместо этого используется небольшой явный whitelist:

- `title`
- `description`
- `format`
- `default`
- `examples`
- `deprecated`
- `readOnly`
- `writeOnly`

Остальная metadata остаётся библиотечно-специфичной и автоматически в экспорт не попадает.

Так metadata layer остаётся явным и не превращается в implicit magic.

## Best-Effort режим

Best-effort режим используется по умолчанию:

```typescript
const schema = toJsonSchema(profile)
```

В этом режиме:

- unsupported или opaque nodes превращаются в permissive `{}` schema nodes;
- unsupported object-level shape rules отбрасываются;
- отброшенные shape rules по возможности помечаются через `$comment`.

Этот режим удобен, когда нужен максимально широкий внешний schema export, даже если часть runtime semantics нельзя выразить честно.

## Strict режим

Strict режим отклоняет unsupported nodes:

```typescript
const schema = toJsonSchema(profile, { mode: 'strict' })
```

Если export нельзя представить faithfully, exporter выбрасывает `JsonSchemaExportError`.

Эта ошибка содержит:

- descriptor, на котором произошёл сбой;
- machine-readable причину;
- путь внутри descriptor tree, где возникла ошибка.

Strict режим полезен, когда silent fallback был бы вводящим в заблуждение.

## Неподдерживаемые и opaque cases

Не всё runtime behavior имеет faithful representation в JSON Schema.

Важные примеры:

- custom validators без поддерживаемого публичного descriptor;
- неизвестные custom descriptor kinds;
- object-level `refine(...)` rules;
- descriptor nodes, чья семантика зависит от runtime-only behavior;
- значения, которые нельзя практично представить как JSON Schema constants или enums.

Exporter фиксирует эти границы явно и не пытается гадать.

## Связь с `describe(...)`

`toJsonSchema(...)` находится downstream от `describe(...)`.

Это значит:

- JSON Schema export должен опираться на публичные descriptors;
- логика exporter-а не должна зависеть от приватных runtime internals;
- custom validators участвуют в export сначала через публичный descriptor contract.

Так архитектура остаётся тонкой и стабильной для внешнего tooling.

## Пример metadata-aware экспорта shape

```typescript
const profile = meta(shape({
  email: meta(isString, {
    title: 'Email',
    format: 'email',
  }),
  age: optional(isNumber),
}).strict(), {
  title: 'Profile',
})

const schema = toJsonSchema(profile)
```

Практически это означает:

- metadata shape может стать schema metadata;
- metadata полей может стать metadata свойств;
- strict object behavior становится `additionalProperties: false`.

## Пример ошибки в strict режиме

```typescript
const schema = shape({
  publishedAt: custom({
    check(value: unknown): value is string {
      return typeof value === 'string'
    },
    run() {
      return []
    },
  }),
})

toJsonSchema(schema, { mode: 'strict' })
```

Здесь будет исключение, потому что custom validator остаётся opaque для exporter-а.

## Практические замечания

- воспринимайте JSON Schema export как interoperability layer;
- используйте best-effort режим, когда partial export допустим;
- используйте strict режим, когда unsupported semantics должны приводить к явной ошибке;
- если custom descriptors должны участвовать в export, держите их компактными и публичными;
- не считайте JSON Schema export заменой runtime validation semantics.
