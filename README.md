# `@modulify/validator`

[![codecov](https://codecov.io/gh/modulify/validator/branch/main/graph/badge.svg)](https://codecov.io/gh/modulify/validator)
[![Tests Status](https://github.com/modulify/validator/actions/workflows/tests.yml/badge.svg)](https://github.com/modulify/validator/actions)
[![npm version](https://badge.fury.io/js/%40modulify%2Fvalidator.svg)](https://www.npmjs.com/package/@modulify/validator)


This library provides a declarative validation util.

The util does not provide any text messages in the constraints produced and gives only metadata that can
be used to create a custom view for them.

## Installation

No installation yet

## Usage

```typescript
import {
  Collection,
  Exists,
  Length,
  createValidator,
} from '@modulify/validator'

const validator = createValidator()

const violations = validator.validate({
  form: {
    nickname: '',
    password: '',
  },
}, new Collection({
  form: [
    new Exists(),
    new Collection({
      nickname: new Length({ min: 4 }),
      password: new Length({ min: 6 }),
    }),
  ],
}), /* do not set or set to true for async validation */ false) /* [{
  by: '@modulify/validator/Length',
  value: '',
  path: ['form', 'nickname'],
  reason: 'min',
  meta: 4,
}, {
  by: '@modulify/validator/Length',
  value: '',
  path: ['form', 'password'],
  reason: 'min',
  meta: 6,
}] */
```

### Constraints

Constraints provide information of how the value should be validated.

Available from the box:

* `Collection` &ndash; used for validating objects' structure;
* `Each` &ndash; used for validating arrays' elements; applies specified constraints to each element of an array;
* `Exists` &ndash; used for checking if a value is defined; useful for finding missing keys;
* `Length` &ndash; used for checking arrays' and string's length, available settings (all optional) are:
  * `exact` &ndash; `number`, array or string should have exactly specified count of elements or characters;
  * `max` &ndash; `number`, maximum elements in array or maximum characters in string;
  * `min` &ndash; `number`, minimum elements in array or minimum characters in string;
* `OneOf` &ndash; used for restricting which values can be used.

There is no any basic constraint class to extend, but they should follow signature
described in `types/index.d.ts` &ndash; `Constraint`.

### Validators

Validators provide validation logic that relies on information provided by constraints.

There is no any basic validator class to extend, but they should follow signature
described in `types/index.d.ts` &ndash; `ConstraintValidator`.

### Provider

Provider is used to bind constraints with their validators, provides a validator for a constraint.

All providers should follow signature described in `types/index.d.ts` &ndash; `Provider`.

This feature is responsible for extending validation capabilities. Custom provider can be passed into
`createValidator` function or `override` method of `Validator` instance.

There is a built-in provider &ndash; `ProviderChain`. It allows to "chain" providers &ndash; if
suitable validator was not found in currently used provider, it will try to find it in previous provider that was
overridden by `override` method.

```typescript
import type {
  Constraint,
  ConstraintValidator,
  ConstraintViolation,
  Key,
  Provider,
} from '@modulify/validator'

import {
  ProviderChain,
  createValidator,
} from '@modulify/validator'

class Email implements Constraint {
  public readonly name = '@app/validator/Email'

  toViolation (value: unknown, path: Key[]): ConstraintViolation {
    return {
      by: this.name,
      value,
      path,
    }
  }
}

class EmailValidator implements ConstraintValidator {
  private readonly _constraint: Email

  constructor (constraint: Email) {
    this._constraint = constraint
  }

  validate (value: unknown, path?: Key[]): ConstraintViolation | null {
    if (!(typeof value === 'string') || !/\S+@\S+\.\S+/.test(value)) {
      return this._constraint.toViolation(value, path)
    }

    return null
  }
}
```

then

```typescript
const provider = new ProviderChain(new class implements Provider {
  get (constraint: Constraint) {
    return constraint instanceof Email ? new EmailValidator(constraint) : null
  }

  override (provider: Provider): Provider {
    return new ProviderChain(provider, this)
  }
})
```

or

```typescript
const provider = new class implements Provider {
  get (constraint: Constraint) {
    return constraint instanceof Email ? new EmailValidator(constraint) : null
  }

  override (provider: Provider): Provider {
    return new ProviderChain(provider, this)
  }
}
```

and then

```typescript
const validator = createValidator(provider)
```

or

```typescript
const validator = createValidator()
const overridden = validator.override(provider) // it creates new validator instance, so validator !== overridden
```