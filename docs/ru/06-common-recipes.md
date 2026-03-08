# Практические рецепты

[Оглавление документации](./00-index.md)  
[Английская версия](../en/06-common-recipes.md)

Это руководство отвечает на практический вопрос:

> Какую часть `@modulify/validator` использовать для задачи `X`?

Оно специально ориентировано на практические сценарии. Открывайте его, когда общее направление библиотеки уже понятно и нужен быстрый путь к конкретному решению.

## Сначала выберите правильный слой

Быстрое правило выбора:

- используйте `@modulify/validator/predicates`, когда нужны только runtime checks и type guards;
- используйте built-in assertions вроде `isString`, `isDefined`, `hasLength(...)`, `oneOf(...)`, когда нужны машиночитаемые ошибки;
- используйте combinators вроде `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`, `union(...)`, `discriminatedUnion(...)`, когда валидация становится структурной;
- используйте `meta(...)` и `describe(...)`, когда другой слой нуждается в стабильных машиночитаемых descriptors;
- используйте `toJsonSchema(...)` только тогда, когда нужно представление для interoperability или экспорта, а не источник runtime truth.

## Валидация API payload

Используйте `shape(...)` вместе с leaf assertions.

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

Практический шаблон:

- используйте `.strict()` для request payload, если неизвестные ключи должны отклоняться;
- держите leaf checks маленькими и хорошо сочетаемыми друг с другом;
- используйте элемент кортежа `validated` внутри успешной ветки;
- используйте `violations` как структурированные данные для ответов API, логов или сопоставления с UI.

## Сужение уже существующей переменной в sync-коде

Используйте `matches.sync(...)`.

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

Используйте этот API, когда нужно сузить саму исходную переменную.

Не используйте для этого `validate.sync(...)`, если главная цель — сузить исходную переменную. `validate.sync(...)` сужает `validated` в кортеже, а не исходное входное значение.

## Моделирование optional, nullable и nullish полей

Используйте wrapper, который соответствует вашей runtime-семантике:

- `optional(x)` принимает `undefined`
- `nullable(x)` принимает `null`
- `nullish(x)` принимает и `null`, и `undefined`

```typescript
const profile = shape({
  nickname: optional(isString),
  middleName: nullable(isString),
  bio: nullish(isString),
})
```

Практическое правило:

- используйте `optional(...)` для отсутствующих или неустановленных полей;
- используйте `nullable(...)`, когда `null` — это осмысленное явное значение;
- используйте `nullish(...)` только тогда, когда оба случая действительно допустимы.

## Переиспользование одной shape в нескольких представлениях

Соберите одну базовую shape, а затем выводите производные варианты.

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

Этот шаблон полезен, когда один доменный объект используется в:

- API payload;
- состоянии формы;
- внутренних границах сервиса;
- публичных представлениях с урезанным набором полей.

Помните, что структурные derivations вроде `pick()`, `omit()`, `partial()`, `extend()` и `merge()` намеренно сбрасывают object-level rules.

## Добавление metadata для UI без жёсткой связи UI со слоем валидации

Используйте `meta(...)` поверх любого constraint.

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

Это удобно, когда отдельному слою нужны:

- названия полей;
- placeholders или подсказки для отображения;
- предметно-ориентированные метаданные для отображения;
- инструменты, работающие через descriptors.

Только часть метаданных позже отображается в JSON Schema. Остальные ключи остаются специфичными для библиотеки.

## Построение состояния ошибок полей для форм

Используйте `collection(...)` поверх `violations`.

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

Это рекомендуемая форма, когда нужен точный поиск по path, а не разбор строк.

## Добавление межполевых правил

Используйте `fieldsMatch(...)` для частого случая подтверждения поля и `refine(...)` для всего остального.

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

Выбирайте `fieldsMatch(...)`, когда правило — это именно равенство двух selectors.

Выбирайте `refine(...)`, когда:

- участвуют больше двух полей;
- правило доменно-специфично;
- нужен явный контроль над выходным path;
- нужен custom descriptor для introspection.

## Написание custom validator, понятного инструментам

Используйте `custom(...)` и добавляйте `describe()`, если validator должен участвовать в публичной introspection.

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

Без `describe()` validator намеренно остаётся непрозрачным для `describe(...)` и `toJsonSchema(...)`.

## Безопасный экспорт JSON Schema

Используйте `toJsonSchema(...)` в двух режимах в зависимости от потребителя.

```typescript
import { toJsonSchema } from '@modulify/validator/json-schema'

const schema = toJsonSchema(profile)
const strictSchema = toJsonSchema(profile, { mode: 'strict' })
```

Используйте best-effort режим, когда:

- внешние потребители допускают permissive `{}` nodes;
- частичный экспорт лучше, чем его отсутствие;
- нужно максимально широкое представление schema.

Используйте strict режим, когда:

- экспорт с потерями был бы вводящим в заблуждение;
- JSON Schema является частью контракта;
- unsupported runtime semantics должны падать явно.

## Рекомендуемый порядок чтения

Если вы только входите в библиотеку, самый короткий полезный маршрут такой:

1. `README.md`
2. `01-shape-api.md`
3. `03-violations.md`
4. `02-metadata-and-introspection.md`
5. `04-json-schema-export.md`
6. `07-ai-reference.md`, если нужна компактная сводка по контракту
