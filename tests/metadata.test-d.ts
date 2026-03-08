import type {
  AssertionDescriptor,
  ConstraintDescriptor,
  FieldsMatchObjectShapeRuleDescriptor,
  GenericObjectShapeRuleDescriptor,
  ValidationTuple,
} from '@/index'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import {
  custom,
  describe as describeConstraint,
  exact,
  isString,
  meta,
  optional,
  shape,
  validate,
} from '@/index'

describe('metadata and introspection types', () => {
  test('meta preserves constraint inference', () => {
    const schema = shape({
      nickname: meta(optional(isString), { title: 'Nickname' }),
      role: meta(exact('admin'), { title: 'Role' }),
    })

    const result = validate.sync({
      nickname: undefined,
      role: 'admin',
    }, schema)

    assertType<ValidationTuple<{
      nickname: string | undefined;
      role: 'admin';
    }>>(result)
  })

  test('describe returns a discriminated descriptor union', () => {
    const descriptor = describeConstraint(meta(optional(isString), { title: 'Nickname' }))

    assertType<ConstraintDescriptor>(descriptor)

    if (descriptor.kind === 'optional') {
      assertType<AssertionDescriptor>(descriptor.child)

      if (descriptor.child.kind === 'assertion') {
        assertType<string>(descriptor.child.name)
        assertType<boolean>(descriptor.child.bail)
        assertType<string | undefined>(descriptor.child.code)
        assertType<readonly unknown[] | undefined>(descriptor.child.args)
      }
    }
  })

  test('shape descriptors expose fields and rule descriptors', () => {
    const schema = shape({
      password: isString,
      confirmPassword: isString,
    }).fieldsMatch(['password', 'confirmPassword']).refine(() => [], {
      kind: 'passwordConfirmation',
      metadata: {
        fields: ['password', 'confirmPassword'],
      },
    })

    const descriptor = describeConstraint(schema)

    if (descriptor.kind === 'shape') {
      assertType<AssertionDescriptor>(descriptor.fields.password)
      assertType<'strict' | 'passthrough'>(descriptor.unknownKeys)
      assertType<readonly [
        FieldsMatchObjectShapeRuleDescriptor<'password', 'confirmPassword'>,
        GenericObjectShapeRuleDescriptor<'passwordConfirmation'>,
      ]>(descriptor.rules)
    }
  })

  test('describe preserves custom validator descriptor types', () => {
    const isoDate = custom({
      check(value: unknown): value is string {
        return typeof value === 'string'
      },
      run() {
        return []
      },
      describe() {
        return {
          kind: 'stringFormat' as const,
          format: 'iso-date' as const,
        }
      },
    })

    const descriptor = describeConstraint(meta(isoDate, { title: 'Published at' }))

    if (descriptor.kind === 'stringFormat') {
      assertType<'iso-date'>(descriptor.format)
      assertType<Readonly<Record<string, unknown>> | undefined>(descriptor.metadata)
    }
  })
})
