import type {
  Violation,
  ViolationCollection,
  ViolationTreeNode,
} from '@/index'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import { collection } from '@/index'

type EmailViolation = Violation<{
  kind: 'assertion';
  name: 'isString';
  code: 'type.string';
  args: [];
}>

describe('violation collection types', () => {
  test('collection preserves violation item types across helpers', () => {
    const violations: EmailViolation[] = [{
      value: '',
      path: ['email'],
      violates: {
        kind: 'assertion',
        name: 'isString',
        code: 'type.string',
        args: [],
      },
    }]

    const errors = collection(violations)
    const emailErrors = errors.at(['email'])
    const tree = errors.tree()
    const emailNode = tree.at(['email'])

    assertType<ViolationCollection<EmailViolation>>(errors)
    assertType<ViolationCollection<EmailViolation>>(emailErrors)
    assertType<'type.string'[]>(emailErrors.map(violation => violation.violates.code))
    assertType<ViolationTreeNode<EmailViolation>>(tree)
    assertType<ViolationTreeNode<EmailViolation> | undefined>(emailNode)
    assertType<ViolationCollection<EmailViolation>>(tree.self)
    assertType<ViolationCollection<EmailViolation>>(tree.subtree)
  })
})
