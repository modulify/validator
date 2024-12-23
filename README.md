# <img src="./logo.png" alt="Logo" width="36" /> `@modulify/validator`

[![codecov](https://codecov.io/gh/modulify/validator/branch/main/graph/badge.svg)](https://codecov.io/gh/modulify/validator)
[![Tests Status](https://github.com/modulify/validator/actions/workflows/tests.yml/badge.svg)](https://github.com/modulify/validator/actions)
[![npm version](https://badge.fury.io/js/%40modulify%2Fvalidator.svg)](https://www.npmjs.com/package/@modulify/validator)

This library provides a declarative validation utility.

The utility does not include text messages in the generated violations but instead provides metadata that can
be used to create a custom view for them.

## Installation

Using `yarn`:

```
yarn add @modulify/validator
```

or, using `npm`:

```
npm install @modulify/validator --save
```

## Usage

```typescript
import {
  HasLength,
  HasProperties,
  IsDefined,
  IsString,
  validate,
} from '@modulify/validator'

const violations = await validate({
  form: {
    nickname: '',
    password: '',
  },
}, HasProperties({
  form: [
    IsDefined(),
    HasProperties({
      nickname: IsString.That(HasLength({ min: 4 })),
      password: IsString.That(HasLength({ min: 6 })),
    }),
  ],
})) /* [{
  value: '',
  path: ['form', 'nickname'],
  violates: '@modulify/validator/IsString',
  reason: 'min',
  meta: 4,
}, {
  value: '',
  path: ['form', 'password'],
  violates: '@modulify/validator/IsString',
  reason: 'min',
  meta: 6,
}] */
```

or (for synchronous validation):

```typescript
const violations = validate.sync({
  form: {
    nickname: '',
    password: '',
  },
}, HasProperties({
  form: [
    IsDefined(),
    HasProperties({
      nickname: IsString.That(HasLength({ min: 4 })),
      password: IsString.That(HasLength({ min: 6 })),
    }),
  ],
}))
```

## Exported types

* `Violation` – an object that contains information about a value – why it violates one or more constraints;
  includes following fields:
  * `value` – value that violates something;
  * `path` – path to the value, an empty array for scalar values and represents full path to the value in a complex
    object;
  * `violates` – indicator of the violated constraint;
  * `reason` – indicator of the reason why the constraint is violated;
  * `meta` – some data to describe the reason – what exactly the boundaries were not met;
  ```typescript
  import type { Violation } from '@modulify/validator/types'
  ```
* `Predicate` – function that accepts a value and returns `true` or `false`; logical unit that is used for checking
  multiple things: type or if the value satisfies certain criteria; accepts generic argument `T` to specify
  the type of the value, if predicate returns `true`;
  ```typescript
  import type { Predicate } from '@modulify/validator/types'
  ```
* `Assertion` – extension of the `Predicate` type that includes:
  * `fqn` – field – some predefined name that will be used as a value for the `violates` field of `Violation`;
  * `bail` – field – flag that interrupts further validation if the assertion fails;
  * `reason` – field, optional – string or symbol that is used to indicate, why assertion has failed;
    always added to a violation object, if present;
  * `meta` – field, optional – some metadata to use in further analysis; always added to a violation object, if present;
  * `That` – method – used to extend assertion with other assertions;
  * `also` – field – readonly array of other assertions that was attached by `That` method;
  ```typescript
  import type { Assertion } from '@modulify/validator/types'
  ```

## Exported members

* `validate` – function that accepts a value for validation as the first argument, constraints as the second,
  and path to a value as the third (that is optional and used mostly for internal purposes, as validation is recursive);
  includes method `sync` that has the same arguments set but performs validation synchronously and throws error when
  finds an asynchronous constraint;

* `Assert` – creates assertion from logical predicate:
  ```typescript
  const IsSomething = Assert(isSomething, {
    fqn: 'Some fqn',
    bail: true,
  })
  ```
  Arguments:
  * Logical predicate
  * Options, that includes `fqn`, `bail`, `reason` (optional), and `meta` (optional);
* `HasLength` – checks length property of the specified string or array; can be configured with options:
  * `exact` – if the length should be exactly equal the specified value;
  * `max` – if the length should be equal or less than the specified value;
  * `min` – if the length should be equal or greater than the specified value;
  * `bail` – set this to true if you need to interrupt further validation if the assertion fails;
* `IsBoolean` – checks if the value is **boolean**; interrupts further validation if fails;
* `IsDate` – checks if the value is Date **object**; interrupts further validation if fails;
* `IsDefined` – checks if the value is **not undefined**; interrupts further validation if fails;
* `IsEmail` – checks if the value is a **valid email**; interrupts further validation if fails;
* `IsNull` – checks if the value is **null**; interrupts further validation if fails;
* `IsNumber` – checks if the value is **number**; interrupts further validation if fails;
* `IsString` – checks if the value is **string**; interrupts further validation if fails;
* `IsSymbol` – checks if the value is a **symbol**; interrupts further validation if fails;
* `OneOf` – checks if the value equal to one of the specified values; can be configured with:
  * `equalTo` – predicate f(a, b) that checks if two values are equal or not;
  by default the strict `===` comparison is used
  * `bail` – set this to true if you need to interrupt further validation if the assertion fails;

* `Each` – a runner that runs validation for each element in array;
* `HasProperties` – a runner that runs object's structure check.