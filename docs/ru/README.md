# <img src="../../logo.png" alt="Logo" width="36" /> `@modulify/validator`

[![npm version](https://img.shields.io/npm/v/@modulify/validator.svg)](https://www.npmjs.com/package/@modulify/validator)
[![codecov](https://codecov.io/gh/modulify/validator/branch/main/graph/badge.svg)](https://codecov.io/gh/modulify/validator)
[![Tests Status](https://github.com/modulify/validator/actions/workflows/tests.yml/badge.svg)](https://github.com/modulify/validator/actions)

[README на английском](../../README.md)  
[Индекс русской документации](./00-index.md)

`@modulify/validator` — небольшая TypeScript-библиотека для валидации, построенная вокруг трёх отдельных слоёв:

- predicates для проверок во время выполнения и сужения типов;
- assertions для машиночитаемых результатов валидации с ошибкой;
- combinators для композиции схем, включая структурную рекурсию по массивам и объектам.

Проект сознательно строится вокруг структурированных метаданных, а не вокруг встроенных человекочитаемых сообщений об ошибках.

## Что это за проект

Эта библиотека рассчитана на случаи, когда вам нужно:

- сохранить простые type guards полезными сами по себе;
- валидировать вложенные данные рекурсивно;
- получать структурированные violations вместо текстовых сообщений;
- позже самостоятельно решать, как эти violations показывать или преобразовывать.

Типичные результаты слоя валидации можно преобразовать в:

- локализованные сообщения об ошибках;
- состояние ошибок полей формы;
- API payloads с ошибками;
- данные для аналитики или отладки;
- собственный UI или узлы virtual DOM.

## Идея

Проект разделяет две задачи, которые часто смешиваются в одной абстракции.

### Предикаты

Predicates — это небольшие проверки во время выполнения, которые одновременно работают как TypeScript type guards.

Они отвечают на вопросы вроде:

- является ли это значение строкой?
- является ли это значение объектом с определённой формой?
- выполняет ли это значение базовое логическое условие?

Этот слой должен оставаться простым и полезным сам по себе даже вне контура валидации.

### Валидаторы и assertions

Assertions — это проверки, которые могут вернуть violation со структурированными метаданными.

Вместо генерации текстового сообщения assertion возвращает данные, которые описывают:

- что именно сломалось;
- где это произошло;
- какой семантический код сработал;
- какие аргументы или границы были задействованы.

Так представление результата остаётся за пределами библиотеки.

### Почему это существует рядом с `zod`-подобными библиотеками

Библиотеки вроде `zod`, `yup` и других schema-oriented инструментов хорошо известны и отлично решают большой класс задач.

Задача этого проекта в другом.

Он в первую очередь не пытается быть:

- schema-definition DSL;
- form library со встроенной семантикой сообщений;
- all-in-one parsing и слой представления.

Вместо этого проект фокусируется на:

- маленьких predicates для narrowing;
- отдельном слое assertions для diagnostics;
- composable schema combinators;
- machine-readable violations, которые потребитель может преобразовывать как угодно.

Короткое описание направления проекта:

> Type-safe predicates for narrowing, and validators for machine-readable diagnostics.

Или ещё короче:

> No messages, only meaning.

## Установка

Через `yarn`:

```bash
yarn add @modulify/validator
```

Через `npm`:

```bash
npm install @modulify/validator --save
```

## Быстрый пример

```typescript
import {
  each,
  shape,
  exact,
  hasLength,
  isDefined,
  isString,
  nullable,
  optional,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = await validate({
  form: {
    nickname: undefined,
    title: null,
    password: '',
    role: 'admin',
  },
}, shape({
  form: [
    isDefined,
    shape({
      nickname: optional([isString, hasLength({ min: 4 })]),
      title: nullable(isString),
      password: [isString, hasLength({ min: 6 })],
      role: exact('admin'),
    }),
  ],
}))

if (ok) {
  validated.form.nickname.toUpperCase()
} else {
  console.log(violations)
}
```

Синхронная валидация:

```typescript
const [ok, validated, violations] = validate.sync({
  form: {
    nickname: '',
    password: '',
  },
}, shape({
  form: [
    isDefined,
    shape({
      nickname: [isString, hasLength({ min: 4 })],
      password: [isString, hasLength({ min: 6 })],
    }),
  ],
}))

if (ok) {
  validated.form.password.toUpperCase()
}
```

Сужение исходной переменной в sync-коде:

```typescript
import {
  isDefined,
  isString,
  matches,
} from '@modulify/validator'

const value: unknown = 'nickname'

if (matches.sync(value, [isDefined, isString])) {
  value.toUpperCase()
}
```

Сильная типизация успешной ветки прямо из `validate`:

```typescript
import {
  shape,
  isDefined,
  isString,
  validate,
} from '@modulify/validator'

const schema = shape({
  name: [isDefined, isString],
})

const [ok, validated, violations] = await validate({ name: 'Kirill' }, schema)

if (ok) {
  validated.name.toUpperCase()
} else {
  console.log(violations)
}
```

## API объектных схем

`shape(...)` — это переиспользуемый API объектных схем. Он валидирует вложенные record-like objects и предоставляет небольшой неизменяемый API вроде `strict()`, `pick()`, `omit()`, `partial()`, `extend()`, `merge()`, `refine()` и `fieldsMatch(...)`.

```typescript
import {
  isString,
  optional,
  shape,
  validate,
} from '@modulify/validator'

const profile = shape({
  id: isString,
  nickname: optional(isString),
})

const [ok] = validate.sync({
  id: 'u1',
  nickname: 'neo',
}, profile)
```

Подробные руководства:

- [Руководство по API объектных схем](./01-shape-api.md)

## Метаданные и интроспекция

`meta(...)` добавляет машиночитаемые метаданные к любому constraint, а `describe(...)` возвращает стабильное рекурсивное дерево descriptors для built-in constraints и совместимых custom validators.

```typescript
import {
  describe,
  isString,
  meta,
  optional,
  shape,
} from '@modulify/validator'

const registration = meta(shape({
  email: meta(isString, {
    title: 'Email',
    placeholder: 'name@example.com',
  }),
  nickname: optional(isString),
}).strict(), {
  title: 'Registration form',
})

const node = describe(registration)
```

Подробные руководства:

- [Руководство по метаданным и интроспекции](./02-metadata-and-introspection.md)

## Ментальная модель

Практически про библиотеку удобно думать так:

- predicates отвечают: удовлетворяет ли значение условию `X`?
- assertions отвечают: если нет, то что именно сломалось?
- combinators отвечают: как объединять constraints в более крупную схему, включая рекурсивный обход объектов и массивов?

В текущем API это обычно выглядит так:

- leaf checks через assertions вроде `isString`, `isDefined`, `hasLength`, `oneOf`;
- композиция схем через combinators вроде `exact`, `optional`, `nullable`, `nullish`, `shape(...)`, `each(...)`;
- типизированная валидация через `validate(...)` или `validate.sync(...)`;
- narrowing исходной переменной в sync-коде через `matches.sync(...)`.

## Нарушения

`validate(...)` возвращает машиночитаемый список `Violation[]`, а `collection(...)` может обернуть его в небольшой helper API для точного поиска по path и обхода дерева.

```typescript
import {
  collection,
  isString,
  shape,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = validate.sync({
  profile: {
    email: '',
  },
}, shape({
  profile: shape({
    email: isString,
  }),
}))

const errors = collection(violations)

const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
```

Подробные руководства:

- [Руководство по нарушениям](./03-violations.md)

## Экспорт JSON Schema

`toJsonSchema(...)` строит представление JSON Schema поверх того же публичного дерева descriptors, которое возвращает `describe(...)`.

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

Подробные руководства:

- [Руководство по экспорту JSON Schema](./04-json-schema-export.md)

## Публичный API

Подробное руководство по public API описывает root exports, специализированные subpath exports, validation result tuple и то, как package surface разделён между validation, predicates, violations, metadata и экспортом JSON Schema.

Подробные руководства:

- [Руководство по публичному API](./05-public-api.md)

## Практические рецепты и справка для AI

Есть ещё два руководства, которые полезны, когда нужен более быстрый практический вход вместо последовательного чтения всей концептуальной документации.

- [Практические рецепты](./06-common-recipes.md) - практические примеры для валидации payload, выбора wrappers, переиспользуемых shape, сопоставления ошибок формы и экспорта JSON Schema.
- [Справка для AI](./07-ai-reference.md) - компактное описание контракта для agents, инструментов и быстрого поиска семантики библиотеки.

## Заметки

- Assertions возвращают структурированные метаданные вместо сообщений.
- Combinators — это тонкие вспомогательные средства для построения схем поверх assertions и validators; `each` и `shape` в этой модели являются structural combinators.
- Predicates должны оставаться полезными независимо от слоя валидации.
- Библиотекой проще пользоваться, когда во всём проекте сохраняется один стабильный violation format.
- `validate(...)` сужает тип `validated` в tuple, а не исходную входную переменную.
- Чтобы сузить исходную переменную в sync-коде, используйте `matches.sync(...)`.

## Переводы

- [English](../../README.md)
