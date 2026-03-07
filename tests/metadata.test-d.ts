import type {
  ConstraintDescriptor,
  ObjectShapeRuleDescriptor,
  ValidationTuple,
} from '@/index'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import {
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
      assertType<ConstraintDescriptor>(descriptor.child)

      if (descriptor.child.kind === 'assertion') {
        assertType<string>(descriptor.child.name)
        assertType<boolean>(descriptor.child.bail)
      }
    }
  })

  test('shape descriptors expose fields and rule descriptors', () => {
    const schema = shape({
      password: isString,
      confirmPassword: isString,
    }).fieldsMatch(['password', 'confirmPassword']).refine(() => [])

    const descriptor = describeConstraint(schema)

    if (descriptor.kind === 'shape') {
      assertType<ConstraintDescriptor>(descriptor.fields.password)
      assertType<'strict' | 'passthrough'>(descriptor.unknownKeys)
      assertType<readonly ObjectShapeRuleDescriptor[]>(descriptor.rules)
    }
  })
})
