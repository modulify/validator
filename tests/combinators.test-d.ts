import type {
  AsyncObjectShapeRuleDescriptor,
  ShapeRefinement,
  ShapeRefinementViolationInput,
  SyncShapeRefinement,
  ValidationResult,
  Violation,
} from '@/index'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import {
  discriminatedUnion,
  exact,
  nullable,
  nullish,
  optional,
  record,
  shape,
  tuple,
  union,
} from '@/combinators'
import {
  hasLength,
  isNumber,
  isString,
  matches,
  describe as describeConstraint,
  validate,
} from '@/index'

describe('combinator types', () => {
  test('shape rejects incompatible staged assertion tuples in fields', () => {
    shape({
      // @ts-expect-error incompatible clarifying assertion
      name: [isNumber, hasLength({ min: 3 })] as const,
    })
  })

  test('exact preserves literal types', () => {
    const result = validate.sync('admin', exact('admin'))

    assertType<ValidationResult<'admin'>>(result)
  })

  test('optional, nullable and nullish affect inferred object types', () => {
    const schema = shape({
      nickname: optional(isString),
      middleName: nullable(isString),
      bio: nullish(isString),
      role: exact('admin'),
    })

    const result = validate.sync({
      nickname: undefined,
      middleName: null,
      bio: 'filled',
      role: 'admin',
    }, schema)

    assertType<ValidationResult<{
      nickname: string | undefined;
      middleName: string | null;
      bio: string | null | undefined;
      role: 'admin';
    }>>(result)
  })

  test('matches.sync narrows the original value with combinators', () => {
    const value: unknown = undefined

    if (matches.sync(value, optional(isString))) {
      assertType<string | undefined>(value)
    }

    const role: unknown = 'admin'

    if (matches.sync(role, exact('admin'))) {
      assertType<'admin'>(role)
    }
  })

  test('failure branches keep violation arrays', () => {
    const [ok, validated, violations] = validate.sync('user', exact('admin'))

    if (ok) {
      assertType<'admin'>(validated)
      assertType<[]>(violations)
    } else {
      assertType<unknown>(validated)
      assertType<Violation[]>(violations)
    }
  })

  test('tuple preserves positional inference', () => {
    const result = validate.sync(['admin', undefined], tuple([exact('admin'), optional(isString)]))

    assertType<ValidationResult<['admin', string | undefined]>>(result)
  })

  test('record wraps value inference for dynamic keys', () => {
    const result = validate.sync({
      primary: 'admin',
      backup: 'admin',
    }, record(exact('admin')))

    assertType<ValidationResult<Record<string, 'admin'>>>(result)
  })

  test('union combines branch inference into a union type', () => {
    const result = validate.sync('admin', union([exact('admin'), isNumber]))

    assertType<ValidationResult<'admin' | number>>(result)
  })

  test('union preserves object variant inference', () => {
    const result = validate.sync({
      kind: 'team',
      size: undefined,
    }, union([
      shape({
        kind: exact('user'),
        name: isString,
      }),
      shape({
        kind: exact('team'),
        size: optional(isString),
      }),
    ]))

    assertType<ValidationResult<
      | { kind: 'user'; name: string }
      | { kind: 'team'; size: string | undefined }
    >>(result)
  })

  test('discriminatedUnion preserves tagged object inference', () => {
    const result = validate.sync({
      kind: 'team',
      size: undefined,
    }, discriminatedUnion('kind', {
      user: shape({
        kind: exact('user'),
        name: isString,
      }),
      team: shape({
        kind: exact('team'),
        size: optional(isString),
      }),
    }))

    assertType<ValidationResult<
      | { kind: 'user'; name: string }
      | { kind: 'team'; size: string | undefined }
    >>(result)
  })

  test('shape preserves descriptor inference and object helpers derive new shapes', () => {
    const profile = shape({
      id: isString,
      nickname: optional(isString),
      role: exact('admin'),
    })

    const picked = profile.pick(['id', 'nickname'])
    const omitted = profile.omit(['nickname'])
    const partialProfile = profile.partial()
    const extended = profile.extend({ team: isString })
    const merged = profile.merge(shape({ role: exact('editor'), team: isString }))

    assertType<ValidationResult<{
      id: string;
      nickname: string | undefined;
    }>>(validate.sync({
      id: 'u1',
      nickname: undefined,
    }, picked))

    assertType<ValidationResult<{
      id: string;
      role: 'admin';
    }>>(validate.sync({
      id: 'u1',
      role: 'admin',
    }, omitted))

    assertType<ValidationResult<{
      id: string | undefined;
      nickname: string | undefined;
      role: 'admin' | undefined;
    }>>(validate.sync({}, partialProfile))

    assertType<ValidationResult<{
      id: string;
      nickname: string | undefined;
      role: 'admin';
      team: string;
    }>>(validate.sync({
      id: 'u1',
      nickname: undefined,
      role: 'admin',
      team: 'validators',
    }, extended))

    assertType<ValidationResult<{
      id: string;
      nickname: string | undefined;
      role: 'editor';
      team: string;
    }>>(validate.sync({
      id: 'u1',
      nickname: undefined,
      role: 'editor',
      team: 'validators',
    }, merged))
  })

  test('refine and fieldsMatch keep the original inferred shape type', () => {
    const registration = shape({
      password: isString,
      confirmPassword: isString,
    }).refine(async value => {
      assertType<{
        password: string;
        confirmPassword: string;
      }>(value)

      return []
    })
    const syncRegistration = shape({
      password: isString,
      confirmPassword: isString,
    }).refine.sync(value => {
      assertType<{
        password: string;
        confirmPassword: string;
      }>(value)

      return []
    })

    const confirmedRegistration = registration.fieldsMatch(['password', 'confirmPassword'])

    assertType<Promise<ValidationResult<{
      password: string;
      confirmPassword: string;
    }>>>(validate({
      password: 'secret',
      confirmPassword: 'secret',
    }, registration))

    assertType<Promise<ValidationResult<{
      password: string;
      confirmPassword: string;
    }>>>(validate({
      password: 'secret',
      confirmPassword: 'secret',
    }, confirmedRegistration))

    assertType<ValidationResult<{
      password: string;
      confirmPassword: string;
    }>>(validate.sync({
      password: 'secret',
      confirmPassword: 'secret',
    }, syncRegistration))
  })

  test('async refine descriptors are marked in shape metadata types', () => {
    const schema = shape({
      password: isString,
      confirmPassword: isString,
    }).refine(async () => [], {
      kind: 'passwordConfirmation',
    })

    const descriptor = describeConstraint(schema)

    if (descriptor.kind === 'shape') {
      assertType<readonly [AsyncObjectShapeRuleDescriptor<'passwordConfirmation'>]>(descriptor.rules)
    }
  })

  test('object-level refinement types expose async-first and sync-safe names', () => {
    assertType<ShapeRefinement<{ password: string }>>(async value => {
      assertType<string>(value.password)

      return []
    })

    assertType<SyncShapeRefinement<{ password: string }>>(value => {
      assertType<string>(value.password)

      return []
    })

    assertType<ShapeRefinementViolationInput<'shape.fields.mismatch'>>({
      code: 'shape.fields.mismatch',
      args: [[['password'], ['confirmPassword']]],
    })
  })

  test('fieldsMatch also accepts nested path selectors without changing inferred shape types', () => {
    const registration = shape({
      password: isString,
      confirm: shape({
        password: isString,
      }),
    }).fieldsMatch([['password'], ['confirm', 'password']])

    assertType<ValidationResult<{
      password: string;
      confirm: {
        password: string;
      };
    }>>(validate.sync({
      password: 'secret',
      confirm: {
        password: 'secret',
      },
    }, registration))
  })

  test('fieldsMatch also accepts mixed top-level and nested selectors', () => {
    const registration = shape({
      password: isString,
      confirm: shape({
        password: isString,
      }),
    }).fieldsMatch(['password', ['confirm', 'password']])

    assertType<ValidationResult<{
      password: string;
      confirm: {
        password: string;
      };
    }>>(validate.sync({
      password: 'secret',
      confirm: {
        password: 'secret',
      },
    }, registration))
  })
})
