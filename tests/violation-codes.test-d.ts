declare module '@/index' {
  interface ViolationCodeRegistry {
    'app.user.conflict': import('@/index').ViolationCodeEntry<'validator', 'user', readonly [id: string]>;
    'shape.password.mismatch': import('@/index').ViolationCodeEntry<'validator', 'shape', readonly []>;
    'legacy.only-code': never;
  }
}

import type {
  KnownViolationSubject,
  ObjectShapeRefinementIssue,
  ViolationArgs,
  ViolationCode,
  ViolationEntry,
  ViolationKindOf,
  ViolationNameOf,
  ViolationSubject,
} from '@/index'

import {
  assertType,
  describe,
  test,
} from 'vitest'

import { assert } from '@/assertions'
import { describe as describeConstraint } from '@/index'

describe('violation code registry augmentation', () => {
  test('accepts externally augmented codes and derives their contracts', () => {
    assertType<ViolationCode>('app.user.conflict')
    assertType<ViolationCode>('shape.password.mismatch')
    assertType<ViolationCode>('legacy.only-code')

    const subject = {
      kind: 'validator' as const,
      name: 'user',
      code: 'app.user.conflict' as const,
      args: ['user-1'] as const,
    } satisfies ViolationSubject<'app.user.conflict'>

    const strictSubject = {
      kind: 'validator' as const,
      name: 'shape',
      code: 'shape.password.mismatch' as const,
      args: [] as const,
    } satisfies KnownViolationSubject<'shape.password.mismatch'>

    const issue = {
      code: 'shape.password.mismatch' as const,
      args: [] as const,
    } satisfies ObjectShapeRefinementIssue<'shape.password.mismatch'>

    const legacySubject = {
      kind: 'runtime' as const,
      name: 'legacy',
      code: 'legacy.only-code' as const,
      args: ['anything'] as const,
    } satisfies ViolationSubject<'legacy.only-code'>

    assertType<'app.user.conflict'>(subject.code)
    assertType<readonly ['user-1']>(subject.args)
    assertType<readonly []>(strictSubject.args)
    assertType<'shape.password.mismatch'>(issue.code)
    assertType<readonly [id: string]>({} as ViolationArgs<'app.user.conflict'>)
    assertType<'validator'>({} as ViolationKindOf<'app.user.conflict'>)
    assertType<'user'>({} as ViolationNameOf<'app.user.conflict'>)
    assertType<{
      kind: 'validator';
      name: 'user';
      args: readonly [id: string];
    }>({} as ViolationEntry<'app.user.conflict'>)
    assertType<string>(legacySubject.name)
  })

  test('preserves explicit custom assertion codes in descriptors', () => {
    const customAssertion = assert(
      (value: unknown): value is string => typeof value === 'string',
      {
        name: 'isUserId',
        bail: true,
        code: 'app.user.conflict',
      }
    )

    const descriptor = describeConstraint(customAssertion)

    if (descriptor.kind === 'assertion') {
      assertType<'app.user.conflict'>(descriptor.code)
    }
  })
})
