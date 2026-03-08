# Метаданные и интроспекция

[Оглавление документации](./00-index.md)  
[English version](../en/02-metadata-and-introspection.md)

`@modulify/validator` предоставляет публичный слой introspection, построенный вокруг двух небольших entrypoint-ов:

- `meta(...)` для привязки machine-readable metadata к любому constraint;
- `describe(...)` для чтения стабильного рекурсивного descriptor tree из built-in constraints и совместимых custom validators.

Этот слой намеренно adapter-oriented. Он нужен для того, чтобы прикладной код и tooling могли исследовать структуру валидации без зависимости от приватных runtime internals.

## Быстрый старт

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
    format: 'email',
  }),
  nickname: optional(isString),
}).strict(), {
  title: 'Registration form',
})

const descriptor = describe(registration)
```

## Что делает `meta(...)`

`meta(...)` добавляет read-only machine-readable metadata к constraint, не меняя validation semantics.

Это значит:

- исходный constraint не мутируется;
- поведение валидации при успехе и ошибке остаётся тем же;
- metadata становится видна через `describe(...)`;
- вложенная metadata остаётся ровно там, где была применена.

Пример:

```typescript
const email = meta(isString, {
  title: 'Email',
  widget: 'email',
})
```

Тот же механизм работает для:

- assertions;
- wrappers вроде `optional(...)`;
- object shapes;
- structural validators вроде `each(...)` или `tuple(...)`;
- custom validators.

## Metadata явная, а не наследуемая

Metadata не распространяется автоматически по descriptor tree.

Если metadata повешена на parent shape, она остаётся на узле shape. Если metadata повешена на child field, она остаётся на узле этого поля.

```typescript
const profile = meta(shape({
  email: meta(isString, { title: 'Email' }),
  name: isString,
}), {
  title: 'Profile',
})
```

В этом примере:

- узел shape получает `title: 'Profile'`;
- поле `email` получает `title: 'Email'`;
- поле `name` не получает metadata, пока вы не добавите её явно.

Это делает metadata предсказуемой и убирает скрытое tree-wide поведение.

## Объединение metadata

Если `meta(...)` применяется к одному и тому же constraint несколько раз, metadata merge-ится слева направо.

```typescript
const annotated = meta(
  meta(isString, { title: 'Email' }),
  { placeholder: 'name@example.com' }
)
```

В результате получится один descriptor node, у которого `metadata` содержит оба ключа.

## Что возвращает `describe(...)`

`describe(...)` возвращает стабильный рекурсивный descriptor tree.

Descriptor намеренно machine-readable, а не presentation-oriented. Он спроектирован для adapters и tooling, а не для встроенного рендеринга human-readable messages.

Примеры built-in `kind`:

- `'assertion'`;
- `'allOf'`;
- `'optional'`, `'nullable'`, `'nullish'`;
- `'shape'`, `'each'`, `'tuple'`, `'record'`;
- `'union'`, `'discriminatedUnion'`;
- `'validator'` как generic fallback для custom validators без публичного structural descriptor.

## Descriptor-ы assertions

Leaf assertions создают descriptors с:

- `kind: 'assertion'`;
- `name`;
- `bail`;
- основными `code` и `args`;
- `constraints` для дополнительного checker pipeline;
- опциональной `metadata`.

Пример:

```typescript
const descriptor = describe(meta(isString, { title: 'Display name' }))
```

Так assertion metadata становится доступной без изменения runtime-поведения самой assertion.

## Descriptor-ы wrappers и structural validators

Composed validators описывают себя рекурсивно.

Примеры:

- `optional(...)` раскрывает `child`;
- `each(...)` раскрывает `item`;
- `tuple(...)` раскрывает `items`;
- `union(...)` раскрывает `branches`;
- `record(...)` раскрывает `values`.

Именно эта рекурсивная структура делает возможными adapter layers без доступа к runtime internals валидаторов.

## Descriptor-ы shape

У shape один из самых богатых built-in descriptor nodes.

Shape descriptor включает:

- `metadata`;
- `unknownKeys` со значениями `'passthrough'` или `'strict'`;
- `fields` с descriptor-ами полей;
- `rules` с компактными summary object-level rules вроде `refine(...)` и `fieldsMatch(...)`.

Пример:

```typescript
const descriptor = describe(shape({
  email: meta(isString, { format: 'email' }),
  password: isString,
}).strict())
```

Это особенно полезно для:

- form adapters;
- contract adapters;
- custom documentation generators;
- JSON Schema export через отдельный derivation layer.

## Правила уровня объекта в introspection

Сами callbacks из `refine(...)` не сериализуются.

Вместо этого shape хранит лёгкие rule descriptors в `rules`.

Built-in примеры:

- `fieldsMatch(...)` создаёт компактный `fieldsMatch` rule descriptor;
- `refine(...)` может принимать собственный компактный rule descriptor object.

Так публичное descriptor tree остаётся стабильным и достаточно сериализуемым для tooling, при этом библиотека не пытается сериализовать произвольные callbacks.

## Пользовательские validators

Custom validators могут участвовать в том же слое introspection через `custom(...)` и публичный метод `describe()`.

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
      kind: 'stringFormat',
      format: 'iso-date',
    } as const
  },
})
```

Тогда:

- `describe(isoDate)` вернёт этот публичный descriptor;
- `meta(...)` всё ещё сможет добавить metadata поверх него.

Если custom validator не реализует `describe()`, `describe(...)` вернёт fallback:

```typescript
{ kind: 'validator' }
```

Этот fallback специально минимальный.

## Пример adapter-а

Небольшой adapter может пройти по shape descriptor и собрать widget hints:

```typescript
import type { ConstraintDescriptor } from '@modulify/validator'

function collectFieldWidgets(node: ConstraintDescriptor) {
  if (node.kind !== 'shape') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(node.fields).map(([key, child]) => [key, child.metadata?.widget ?? 'text'])
  )
}
```

В этом и состоит основная цель слоя introspection: внешний код может построить своё представление, не зная, как именно внутри реализована runtime validation.

## Связь с экспортом JSON Schema

`toJsonSchema(...)` — это отдельный слой, производный от публичного descriptor contract.

Это значит:

- `describe(...)` — публичный источник истины для introspection;
- JSON Schema export строится поверх него;
- библиотека не поддерживает вторую скрытую schema model специально для exporter-ов.

Такое разделение сделано намеренно:

- runtime validation остаётся runtime-first;
- metadata остаётся явной;
- export behavior может развиваться как тонкий adapter layer.

## Практические границы

Текущие границы слоя metadata и introspection:

- нет встроенного message rendering или i18n;
- нет metadata inheritance по дереву;
- нет отдельного schema DSL параллельно runtime constraints;
- нет сериализации runtime callbacks из `refine(...)`;
- custom validators без публичных descriptors намеренно остаются opaque.

## Практические замечания

- используйте `meta(...)`, когда нужны machine-readable annotations, а не скрытое поведение;
- используйте `describe(...)`, когда нужен стабильный structural view дерева constraint-ов;
- держите custom descriptors компактными и ecosystem-facing;
- внешние форматы лучше получать derivation-слоями поверх descriptors, а не чтением приватных validator internals.
