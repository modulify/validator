# API объектных схем

[Оглавление документации](./00-index.md)  
[English version](../en/01-shape-api.md)

`shape(...)` — это переиспользуемый API объектных схем в `@modulify/validator`.

Он сохраняет тот же runtime validation kernel, что и остальная библиотека, но добавляет небольшой неизменяемый object-oriented слой для:

- валидации вложенных объектов;
- переиспользуемых object schema;
- производных схем вроде `pick(...)`, `omit(...)` и `partial(...)`;
- object-level rules вроде `refine(...)` и `fieldsMatch(...)`;
- descriptor-based introspection через `describe(...)`.

## Быстрый старт

```typescript
import {
  exact,
  isString,
  optional,
  shape,
  validate,
} from '@modulify/validator'

const profile = shape({
  id: isString,
  nickname: optional(isString),
  role: exact('admin'),
}).strict()

const [ok, validated, violations] = validate.sync({
  id: 'u1',
  nickname: 'neo',
  role: 'admin',
}, profile)
```

`shape(...)` возвращает обычный validator, поэтому его можно использовать везде, где принимается regular constraint.

## Ментальная модель

Shape по-прежнему остаётся validator-ом. Дополнительный API — это тонкая обёртка поверх object descriptor и небольшого набора immutable helpers для derivation.

Каждое поле в descriptor может содержать:

- один constraint;
- массив constraint-ов, которые выполняются последовательно;
- другой structural validator вроде `shape(...)`, `each(...)`, `tuple(...)`, `record(...)`, `union(...)` или `discriminatedUnion(...)`.

Поэтому object validation остаётся согласованной с остальной библиотекой:

- field-level checks переиспользуют те же assertions и combinators;
- violations сохраняют обычные вложенные `path`;
- introspection идёт через тот же контракт `describe(...)`;
- metadata остаётся явной через `meta(...)`.

## Базовое создание shape

```typescript
import {
  hasLength,
  isDefined,
  isString,
  shape,
} from '@modulify/validator'

const registration = shape({
  email: [isDefined, isString],
  password: [isString, hasLength({ min: 8 })],
})
```

Runtime behavior:

- входное значение должно быть plain record-like object;
- каждое объявленное поле валидируется по своему slot;
- вложенные violations возвращаются на пути поля;
- unknown keys по умолчанию разрешены.

## Неизвестные ключи

У shape есть два режима работы с неизвестными ключами:

- `'passthrough'` — лишние ключи разрешены;
- `'strict'` — лишние ключи создают `shape.unknown-key` violations на пути лишнего ключа.

`shape(...)` по умолчанию создаётся в режиме `'passthrough'`.

```typescript
const profile = shape({
  id: isString,
})

const strictProfile = profile.strict()
const permissiveProfile = strictProfile.passthrough()
```

Важно:

- `strict()` и `passthrough()` сохраняют тот же field descriptor;
- `strict()` и `passthrough()` сохраняют существующие object-level rules;
- меняется только поведение unknown keys.

## Публичные свойства shape

У экземпляров shape есть:

- `descriptor` — текущий object descriptor;
- `unknownKeys` — текущий режим unknown keys;
- стандартное validator-поведение через `check(...)` и `run(...)`.

Это удобно, когда одну и ту же shape нужно валидировать, описывать через `describe(...)` и затем выводить производные схемы без ручной пересборки.

## Производные схемы

Все helpers у shape immutable. Каждый вызов возвращает новую shape.

### `pick(keys)` и `omit(keys)`

Используются, когда нужен поднабор текущей object schema.

```typescript
const profile = shape({
  id: isString,
  nickname: optional(isString),
  role: exact('admin'),
})

const publicProfile = profile.pick(['id', 'nickname'])
const internalProfile = profile.omit(['nickname'])
```

### `partial()`

`partial()` оборачивает каждое поле в `optional(...)`.

```typescript
const editableProfile = profile.partial()
```

Это соответствует текущей модели библиотеки, в которой:

- отсутствующий ключ;
- и ключ со значением `undefined`;

во время валидации трактуются одинаково.

### `extend(descriptor)`

`extend(...)` добавляет или переопределяет поля через обычный object descriptor.

```typescript
const account = profile.extend({
  team: isString,
})
```

### `merge(shape)`

`merge(...)` объединяет текущую shape с другой shape.

```typescript
const account = profile.merge(shape({
  team: isString,
  role: exact('editor'),
}))
```

Поведение:

- unknown-key mode берётся у receiver shape;
- пересекающиеся ключи переопределяются правой shape;
- object-level rules из merge target не пытаются автоматически объединяться в новый общий набор.

## Семантика сохранения rules

Есть намеренное различие между переключением режима и структурным derivation.

`strict()` и `passthrough()` сохраняют object-level rules, потому что структура shape по сути остаётся той же.

`pick()`, `omit()`, `partial()`, `extend()` и `merge()` намеренно сбрасывают object-level rules, потому что generic refinements непрозрачны и могут зависеть от полей, которых больше нет или которые теперь ведут себя иначе.

Так derived schemas остаются предсказуемыми и библиотека не делает сомнительных предположений о валидности старых refinements.

## Правила уровня объекта

Shapes позволяют выражать cross-field invariants без внедрения второй schema language.

### `refine(...)`

`refine(...)` добавляет синхронное object-level rule, которое запускается только после того, как базовая shape уже успешно провалидировалась как объект.

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

`refine(...)` специально остаётся тонким:

- он только sync;
- при успехе возвращает `[]`, `null` или `undefined`;
- при ошибке возвращает один issue или массив issue;
- `path` задаётся относительно текущей shape и по умолчанию равен `[]`;
- `value` необязателен и по умолчанию берётся из значения объекта по этому относительному пути;
- `code` остаётся machine-readable.

Сгенерированные violations используют:

- `violates.kind === 'validator'`;
- `violates.name === 'shape'`.

### Descriptor для refine rule

Сами callbacks не сериализуются, но для rule можно добавить компактный machine-readable descriptor:

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).refine(value => {
  return value.password === value.confirmPassword
    ? []
    : [{ path: ['confirmPassword'], code: 'shape.fields.mismatch' }]
}, {
  kind: 'passwordConfirmation',
  metadata: {
    fields: ['password', 'confirmPassword'],
  },
})
```

Позже это попадает в `describe(...)` в массив `rules`.

### `fieldsMatch(...)`

`fieldsMatch(...)` — небольшой helper для частого случая с полем подтверждения.

```typescript
const registration = shape({
  password: isString,
  confirmPassword: isString,
}).fieldsMatch(['password', 'confirmPassword'])
```

Он также поддерживает nested selectors:

```typescript
const registration = shape({
  password: isString,
  confirm: shape({
    password: isString,
  }),
}).fieldsMatch(['password', ['confirm', 'password']])
```

## Порядок валидации

На верхнем уровне валидация shape устроена так:

1. Вход должен быть plain record-like object.
2. Каждое объявленное поле валидируется рекурсивно.
3. В режиме `'strict'` выполняются проверки неизвестных ключей.
4. Object-level rules запускаются только если structural validation до этого полностью прошла.

Этот порядок важен, потому что object-level rules тогда работают уже с устойчивой провалидированной формой объекта.

## Вложенные shape

Shape можно свободно вкладывать друг в друга, потому что это обычные validators.

```typescript
const form = shape({
  profile: shape({
    email: isString,
    nickname: optional(isString),
  }).strict(),
})
```

Вложенные ошибки сохраняют точные пути вроде `['profile', 'email']`.

## Интроспекция

Shape участвуют в публичном descriptor tree, который возвращает `describe(...)`.

```typescript
import { describe } from '@modulify/validator'

const descriptor = describe(shape({
  email: isString,
}).strict())
```

Shape descriptors содержат:

- `unknownKeys`;
- `fields`;
- `rules`;
- опциональную `metadata`.

Это полезно для adapters, tooling и производных export layers, например для JSON Schema.

## Метаданные

`meta(...)` может аннотировать и shape целиком, и отдельные поля, не меняя validation semantics.

```typescript
import {
  describe,
  meta,
} from '@modulify/validator'

const profile = meta(shape({
  email: meta(isString, {
    title: 'Email',
    format: 'email',
  }),
}).strict(), {
  title: 'Profile',
})

const descriptor = describe(profile)
```

Metadata остаётся полностью явной:

- никакого implicit inheritance по дереву нет;
- metadata shape и metadata полей появляются ровно там, где был вызван `meta(...)`.

## Практические замечания

- `shape(...)` ориентирован на объекты, а не на schema-first подход;
- он переиспользует те же constraints, что и остальная библиотека;
- derived helpers намеренно маленькие и предсказуемые;
- object-level rules выразительны, но остаются лёгкими;
- расхождения между runtime semantics и внешними форматами схем лучше отражать явно через adapter layers вроде `describe(...)` или `toJsonSchema(...)`.
