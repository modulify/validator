# `@modulify/validator`

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
})) /* [{
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