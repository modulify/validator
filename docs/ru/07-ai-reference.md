# Справка для AI

[Оглавление документации](./00-index.md)  
[Английская версия](../en/07-ai-reference.md)

Эта страница — компактное описание контракта для AI agents, code generators, IDE tools и людей, которым нужен максимально короткий и однозначный набор правил.

Её стоит воспринимать как каноническую краткую справку поверх более подробных руководств.

## Базовая модель

`@modulify/validator` организован вокруг трёх основных слоёв:

- predicates: проверки во время выполнения и type guards;
- assertions: машиночитаемые ошибки leaf-уровня;
- combinators: структурная композиция assertions и validators.

Библиотека не строится вокруг встроенных человекочитаемых сообщений.

Violations — это прежде всего структурированные данные.

## Канонические точки входа

Используйте корневой пакет для:

- `validate`
- `validate.sync`
- `matches.sync`
- `meta`
- `describe`
- `custom`
- `collection`
- built-in assertions
- combinators

Используйте `@modulify/validator/predicates` для самостоятельных проверок в стиле guard.

Используйте `@modulify/validator/json-schema` для:

- `toJsonSchema(...)`
- `JsonSchemaExportError`

## Контракт результата валидации

```typescript
type ValidationTuple<T> =
  | [ok: true, validated: T, violations: []]
  | [ok: false, validated: unknown, violations: Violation[]]
```

Важные следствия:

- `validate(...)` сужает `validated` в успешной ветке;
- `validate(...)` не сужает исходную входную переменную;
- `matches.sync(...)` — это API для сужения исходной переменной;
- `violations` при успехе всегда пуст.

## Семантика wrappers

- `optional(x)` принимает `undefined`
- `nullable(x)` принимает `null`
- `nullish(x)` принимает `null | undefined`

Эти wrappers моделируют допустимые значения во время выполнения, а не формулировки для UI.

## Семантика shape

`shape(...)` валидирует обычные record-like objects.

По умолчанию:

- unknown keys разрешены;
- unknown-key mode равен `'passthrough'`;
- object-level rules отсутствуют.

Переключатели режима:

- `.strict()` сохраняет те же поля и rules, но отклоняет unknown keys;
- `.passthrough()` сохраняет те же поля и rules, но разрешает unknown keys.

Структурные derivations:

- `.pick(...)`
- `.omit(...)`
- `.partial(...)`
- `.extend(...)`
- `.merge(...)`

Важное правило:

- structural derivations намеренно сбрасывают object-level rules;
- mode switches намеренно сохраняют object-level rules.

## Контракт violations

Violations — это машиночитаемые объекты с:

- значением, на котором произошла ошибка;
- path;
- semantic subject в `violates`.

Не стройте дальнейшую обработку на разборе текста.

Предпочитайте:

- `violations`
- `collection(...)`
- поиск по path

Вместо:

- сопоставления строк;
- разового разбора сообщений;
- извлечения имён полей из текстов.

## Контракт metadata

`meta(...)` добавляет непрозрачные машиночитаемые метаданные к любому constraint.

`describe(...)` возвращает стабильное рекурсивное дерево descriptors.

Custom validators могут участвовать в этом контракте через `describe()`.

Без `describe()` custom validator намеренно остаётся непрозрачным и обычно выглядит так:

```typescript
{ kind: 'validator' }
```

## Контракт JSON Schema

`toJsonSchema(...)` — это производный слой для interoperability.

Это не источник runtime truth.

Best-effort режим:

- режим по умолчанию;
- unsupported nodes превращаются в permissive `{}` schemas;
- unsupported shape rules могут быть отброшены с `$comment`.

Strict режим:

- выбрасывает `JsonSchemaExportError`;
- содержит `descriptor`, `reason` и `path`.

Важное несоответствие:

- JSON Schema `required` — это лишь приближение runtime semantics вокруг `undefined`;
- не следует ожидать полного семантического совпадения между runtime validation и экспортированной JSON Schema.

## Канонические шаблоны

Используйте это, когда нужно валидировать payload:

```typescript
const [ok, validated, violations] = validate.sync(input, schema)
```

Используйте это, когда нужно сузить исходную переменную:

```typescript
if (matches.sync(value, schema)) {
  // здесь value уже сужено
}
```

Используйте это, когда нужны переиспользуемые object schemas:

```typescript
const schema = shape({...}).strict()
const partial = schema.partial()
const subset = schema.pick([...])
```

Используйте это, когда другому слою нужна машиночитаемая introspection:

```typescript
const descriptor = describe(schema)
```

Используйте это, когда внешней системе нужно представление для экспорта:

```typescript
const jsonSchema = toJsonSchema(schema)
```

## Стоит / Не стоит

Стоит:

- держите leaf constraints маленькими и хорошо сочетаемыми друг с другом;
- относитесь к `violations` как к данным, а не как к сообщениям;
- используйте `shape(...)` для переиспользуемых object contracts;
- добавляйте `describe()` к custom validators, которые должны участвовать в инструментах;
- используйте strict JSON Schema export только тогда, когда экспорт с потерями неприемлем.

Не стоит:

- ожидать, что `validate(...)` сузит исходную входную переменную;
- считать `toJsonSchema(...)` полным зеркалом runtime semantics;
- считать, что structural derivations shape сохраняют object-level rules;
- строить инструменты на приватных internals вместо `describe(...)`;
- строить дальнейшую логику вокруг человекочитаемых строк.

## Лучшие источники истины

Для деталей реализации и edge cases предпочтителен такой порядок:

1. `README.md`
2. `docs/ru/*.md` или `docs/en/*.md`
3. `tests/*.test.ts`
4. `tests/*.test-d.ts`

Тесты — самый точный источник поведения там, где проза может оставлять пространство для неверной интерпретации.
