# Типы кодов нарушений

[Индекс документации](./00-index.md)  
[English version](../en/08-violation-code-types.md)

`@modulify/validator` теперь даёт два связанных слоя для машиночитаемых кодов:

- точные literal-коды в assertion descriptors и structured violations;
- расширяемый глобальный реестр, из которого можно получить project-wide union известных кодов.

В этом руководстве разобрано, когда полезен каждый из слоёв, как они сочетаются и как безопасно расширять их в приложении.

## Быстрый старт

Основные публичные точки входа:

- `ViolationCodeEntry` - компактная контрактная запись для известного кода;
- `ViolationCodeRegistry` - интерфейс-реестр известных кодов;
- `ViolationCode` - union, извлекаемый из `keyof ViolationCodeRegistry`;
- `ViolationArgs<C>`, `ViolationKindOf<C>` и `ViolationNameOf<C>` - code-driven utility types.

Пакет уже содержит built-in ключи для собственных violations, например:

- `'type.string'`
- `'length.min'`
- `'shape.unknown-key'`
- `'runtime.rejection'`

Поэтому такой код работает сразу:

```typescript
import type { ViolationCode } from '@modulify/validator'

const code: ViolationCode = 'type.string'
```

## Точные коды из `describe(...)`

Built-in assertions теперь сохраняют точные literal-коды в интроспекции.

```typescript
import {
  describe,
  hasLength,
  isString,
} from '@modulify/validator'

const stringDescriptor = describe(isString)
const lengthDescriptor = describe(hasLength({ min: 3 }))
```

С точки зрения TypeScript это значит:

- `stringDescriptor.code` имеет тип `'type.string'`;
- `stringDescriptor.args` имеет тип `[]`;
- `lengthDescriptor.code` имеет тип `'length.unsupported-type'`;
- `lengthDescriptor.constraints[number].code` имеет конкретный union length-кодов вместо обычного `string`.

Это удобно для адаптеров и tooling-кода, который читает descriptors и хочет ветвиться по коду без ручных cast.

## Зачем нужен глобальный реестр

Точные literals на отдельных значениях полезны для локальной интроспекции.

Глобальный реестр решает другую задачу: позволяет получить один переиспользуемый union для всего приложения.

```typescript
import type { ViolationCode } from '@modulify/validator'

type AppViolationCode = ViolationCode
```

Такой union удобно использовать в:

- словарях сообщений;
- контрактах аналитики;
- API envelopes с ошибками;
- UI-мапперах состояния ошибок;
- общих helper utilities.

## Расширение `ViolationCodeRegistry`

Реестр рассчитан на module augmentation и теперь хранит небольшие контрактные записи по коду.

```typescript
import type { ViolationCodeEntry } from '@modulify/validator'
import '@modulify/validator'

declare module '@modulify/validator' {
  interface ViolationCodeRegistry {
    'user.email.taken': ViolationCodeEntry<'validator', 'user', readonly []>;
    'profile.password.mismatch': ViolationCodeEntry<'validator', 'shape', readonly []>;
  }
}
```

После этого:

```typescript
import type { ViolationCode } from '@modulify/validator'

const codeA: ViolationCode = 'user.email.taken'
const codeB: ViolationCode = 'profile.password.mismatch'
```

Так можно один раз объявить project-specific коды и потом использовать извлечённый union во всех остальных слоях.

Если в проекте ещё остались старые augmentation-записи с `never`, они по-прежнему будут попадать в `ViolationCode`, но для `kind` / `name` / `args` останется generic fallback, пока вы не переведёте их на `ViolationCodeEntry`.

## Производные типы от кода

После регистрации кода с контрактной записью он становится ключом к связанным типам.

```typescript
import type {
  ViolationArgs,
  ViolationKindOf,
  ViolationNameOf,
  ViolationSubject,
} from '@modulify/validator'

type PasswordArgs = ViolationArgs<'profile.password.mismatch'>
type PasswordKind = ViolationKindOf<'profile.password.mismatch'>
type PasswordName = ViolationNameOf<'profile.password.mismatch'>
type PasswordSubject = ViolationSubject<'profile.password.mismatch'>
```

То есть:

- `PasswordArgs` становится `readonly []`;
- `PasswordKind` становится `'validator'`;
- `PasswordName` становится `'shape'`;
- `PasswordSubject` автоматически получает согласованные `kind`, `name`, `code` и `args`.

## Использование расширенных кодов в custom assertions

Custom assertions могут хранить свои собственные явные literal-коды.

```typescript
import { assert } from '@modulify/validator/assertions'

const isAvailableEmail = assert(
  (value: unknown): value is string => typeof value === 'string' && value.includes('@'),
  {
    name: 'isAvailableEmail',
    bail: true,
    code: 'user.email.taken',
  }
)
```

Тогда `describe(isAvailableEmail).code` будет иметь тип `'user.email.taken'`.

Эта часть не зависит от глобального union. Literal сохраняется прямо из определения assertion.

## Использование расширенных кодов в shape refinements

Та же идея работает и для object-level refinement issues.

```typescript
import type { ObjectShapeRefinementIssue } from '@modulify/validator'
import {
  isEmail,
  isString,
  shape,
} from '@modulify/validator'

const signUpForm = shape({
  email: [isString, isEmail],
  password: isString,
  confirmation: shape({
    password: isString,
  }),
}).refine(value => {
  if (value.password === value.confirmation.password) {
    return []
  }

  return [{
    path: ['confirmation', 'password'],
    code: 'profile.password.mismatch',
    args: [],
  }] satisfies ObjectShapeRefinementIssue<'profile.password.mismatch'>
})
```

Так код refinement остаётся согласованным с тем же реестром, из которого вы строите общий union.

## Практический паттерн для app-level мапперов

Часто поверх codes хочется сделать небольшой слой, который отвечает уже за рендеринг или транспорт.

```typescript
import type {
  Violation,
  ViolationCode,
} from '@modulify/validator'

const labels: Partial<Record<ViolationCode, string>> = {
  'type.string': 'Expected a string',
  'length.min': 'Value is too short',
  'user.email.taken': 'Email is already taken',
}

function toLabel(violation: Violation) {
  return labels[violation.violates.code as ViolationCode] ?? violation.violates.code
}
```

Необязательно превращать все возможные коды в один огромный исчерпывающий словарь. На практике `Partial<Record<ViolationCode, ...>>` часто самый удобный вариант.

## Built-In union и сохранение явных literals

Эти два механизма дополняют друг друга:

- built-in и augmented коды попадают в переиспользуемый union `ViolationCode`;
- явные custom literals сохраняются прямо в местах создания значения, например в `assert(...)` или typed refinement issues.

Это важное различие.

Если вы определили custom literal, но ещё не аугментировали `ViolationCodeRegistry`:

- локальные descriptor и violation значения всё равно могут нести точный literal;
- глобальный union `ViolationCode` пока не будет его содержать.

Если вы аугментировали `ViolationCodeRegistry` через `never`, а не через `ViolationCodeEntry`:

- код попадёт в глобальный union `ViolationCode`;
- для него всё ещё будет использоваться generic fallback по `kind`, `name` и `args`.

Обычно удобно делать так:

1. объявить custom code там, где он создаётся;
2. добавить его в `ViolationCodeRegistry`;
3. использовать `ViolationCode` в адаптерах и app-level helper types.

## Связанные разделы

- [Метаданные и интроспекция](./02-metadata-and-introspection.md)
- [Нарушения](./03-violations.md)
- [Публичный API](./05-public-api.md)
