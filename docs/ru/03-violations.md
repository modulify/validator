# Нарушения

[Оглавление документации](./00-index.md)  
[English version](../en/03-violations.md)

`@modulify/validator` возвращает структурированные violations вместо встроенных human-readable сообщений.

У этой части API два слоя:

- сырой результат `Violation[]`, который возвращают `validate(...)` и `validate.sync(...)`;
- `ViolationCollection` — тонкая utility-обёртка, создаваемая через `collection(...)`.

## Быстрый старт

```typescript
import {
  collection,
  isString,
  shape,
  validate,
} from '@modulify/validator'

const [ok, validated, violations] = validate.sync({
  profile: {
    email: 42,
  },
}, shape({
  profile: shape({
    email: isString,
  }),
}))

const errors = collection(violations)
const emailErrors = errors.at(['profile', 'email'])
```

## Почему нарушения структурированы

Библиотека намеренно возвращает данные, а не presentation.

Это позволяет переиспользовать один и тот же результат для:

- локализованных UI-сообщений;
- form error state;
- API payloads;
- аналитики и диагностики;
- custom adapters и tooling.

## Формат `Violation`

Violation содержит:

- `value` — значение, на котором произошла ошибка;
- `path` — место ошибки внутри вложенного объекта или массива;
- `violates` — machine-readable описание того, что именно нарушено.

Пример:

```typescript
import type { Violation } from '@modulify/validator'

const violation: Violation = {
  value: '',
  path: ['form', 'nickname'],
  violates: {
    kind: 'assertion',
    name: 'hasLength',
    code: 'length.min',
    args: [4],
  },
}
```

## `violates`

Поле `violates` содержит структурированную информацию о нарушении.

Важные части:

- `kind` — какой слой произвёл ошибку;
- `name` — какая assertion или validator её создала;
- `code` — семантический код ошибки;
- `args` — структурированная нагрузка этой ошибки.

Это позволяет потребителю самому решать, как позже рендерить и трансформировать ошибки.

## `violates.kind`

`violates.kind` показывает слой, который создал ошибку:

- `'assertion'`
- `'validator'`
- `'runtime'`

Примеры:

- ошибки `isString` относятся к assertion-level;
- `shape.unknown-key` относится к validator-level;
- rejected async validations могут появиться как runtime-level ошибки.

## Вложенные пути

`path` — это обычный `PropertyKey[]`.

Это значит:

- свойства объекта остаются property keys;
- позиции массивов остаются числовыми индексами;
- вложенные ошибки сохраняют полный абсолютный путь от корня входного значения.

Примеры:

- `['profile', 'email']`
- `['items', 0, 'title']`

Именно поэтому библиотека остаётся adapter-friendly и не сериализует пути в строки.

## Результаты валидации

`validate(...)` и `validate.sync(...)` возвращают:

```typescript
type ValidationTuple<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

То есть:

- при успехе список violations пуст;
- при ошибке возвращается исходное значение и собранный список структурированных нарушений.

## `ViolationCollection`

`ViolationCollection` — это тонкая convenience-обёртка над `Violation[]`.

Она сохраняет модель raw list, но добавляет несколько операций для постобработки:

- `size`
- итерацию через `for...of`
- `.forEach(...)`
- `.map(...)`
- `.at(path)`
- `.tree()`

Её цель — удобство, а не вторая error model.

## `collection(...)`

Используйте `collection(...)`, чтобы обернуть сырой `Violation[]`:

```typescript
const errors = collection(violations)
```

Это особенно полезно, когда валидация уже произошла и дальше нужно:

- посмотреть ошибки конкретного поля;
- собрать вложенное UI-представление;
- сгруппировать или преобразовать коды;
- пользоваться helper-методами без изменения исходного формата данных.

## Точный поиск по пути через `.at(path)`

`.at(path)` делает точное совпадение по пути.

```typescript
const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
```

Важная семантика:

- `at([])` означает root-level ошибки;
- violations без `path` считаются root-level в collection utilities;
- `at(['profile'])` не включает `['profile', 'email']`;
- результатом снова будет `ViolationCollection`.

Это делает path lookup предсказуемым и простым.

## Древовидное представление через `.tree()`

`.tree()` строит вложенное machine-readable дерево из текущей коллекции.

```typescript
const tree = errors.tree()
```

Это полезно, если потребителю нужны:

- иерархический обход;
- рендеринг вложенных ошибок;
- path-aware UI state;
- структурированное debugging view.

Tree nodes содержат:

- `path`
- `self`
- `subtree`
- `children`
- `.at(path)`

## `ViolationTreeNode`

Tree view имеет такой вид:

```typescript
type ViolationTreeNode = {
  path: readonly PropertyKey[]
  self: ViolationCollection
  subtree: ViolationCollection
  children: ReadonlyMap<PropertyKey, ViolationTreeNode>
  at(path: readonly PropertyKey[]): ViolationTreeNode | undefined
}
```

Важно различать:

- `self` содержит только violations ровно на текущем пути;
- `subtree` содержит нарушения на текущем пути и все нарушения потомков.

## Семантика путей в дереве

Tree nodes сохраняют абсолютные пути.

Кроме того:

- промежуточные узлы могут существовать, даже если у них нет собственных violations;
- они всё равно полезны, потому что у потомков могут быть ошибки;
- дерево строится из path arrays, а не из dot-separated строк.

Так структура остаётся согласованной с raw violation format.

## Практический пример

```typescript
const [ok, validated, violations] = validate.sync({
  profile: {
    email: '',
  },
}, shape({
  profile: shape({
    email: [isString],
  }),
}))

const errors = collection(violations)
const rootErrors = errors.at([])
const emailErrors = errors.at(['profile', 'email'])
const codes = emailErrors.map(violation => violation.violates.code)
const tree = errors.tree()
```

Из одного raw списка violations можно получить:

- collections по точному пути;
- отображение кодов;
- дерево для вложенного обхода.

## Практические замечания

- сохраняйте `Violation[]` как канонический transport format;
- используйте `collection(...)` только когда helper API действительно упрощает работу;
- считайте `code` и `args` главными точками интеграции;
- оставляйте message rendering вне validation layer;
- предпочитайте работу с path arrays вместо сериализации путей в строки.
