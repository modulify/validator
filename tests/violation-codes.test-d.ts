declare module '@/index' {
  interface ViolationCodeRegistry {
    'app.user.conflict': import('@/index').ViolationCodeEntry<'validator', 'user', readonly [id: string]>;
    'shape.password.mismatch': import('@/index').ViolationCodeEntry<'validator', 'shape', readonly []>;
    'shape.account.locked': import('@/index').ViolationCodeEntry<'validator', 'shape', readonly [retryAt: number, recoveryUrl: string]>;
    'shape.optional-context': import('@/index').ViolationCodeEntry<'validator', 'shape', readonly [label?: string]>;
    'shape.labels': import('@/index').ViolationCodeEntry<'validator', 'shape', readonly string[]>;
    'legacy.only-code': never;
  }
}

import type {
  KnownViolationSubject,
  ShapeRefinementViolationInput,
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
import {
  describe as describeConstraint,
  isString,
  shape,
  validate,
} from '@/index'

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
    } satisfies ShapeRefinementViolationInput<'shape.password.mismatch'>

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

  test('keeps registered code contracts correlated in unions', () => {
    type Subject = KnownViolationSubject<'app.user.conflict' | 'shape.account.locked'>
    const render = (subject: Subject) => {
      if (subject.code === 'app.user.conflict') {
        assertType<'user'>(subject.name)
        assertType<readonly [id: string]>(subject.args)
      } else {
        assertType<'shape'>(subject.name)
        assertType<readonly [retryAt: number, recoveryUrl: string]>(subject.args)
      }
    }
    // @ts-expect-error arguments belong to a different code
    const wrongArgs: Subject = { kind: 'validator', name: 'shape', code: 'shape.account.locked', args: ['user-1'] }
    // @ts-expect-error constraint name belongs to a different code
    const wrongName: Subject = { kind: 'validator', name: 'user', code: 'shape.account.locked', args: [60, '/recover'] }
    void render; void wrongArgs; void wrongName
  })

  test('requires arguments for registered refinement codes', () => {
    type Input = ShapeRefinementViolationInput<'shape.account.locked' | 'shape.password.mismatch'>
    assertType<ShapeRefinementViolationInput<'shape.optional-context'>>({ code: 'shape.optional-context' })
    assertType<ShapeRefinementViolationInput<'shape.labels'>>({ code: 'shape.labels' })
    assertType<Input>({ code: 'shape.password.mismatch' })
    assertType<Input>({ code: 'shape.account.locked', args: [60, '/recover'] })
    // @ts-expect-error registered code requires its argument tuple
    assertType<Input>({ code: 'shape.account.locked' })
    // @ts-expect-error arguments belong to a different code
    assertType<Input>({ code: 'shape.password.mismatch', args: [60, '/recover'] })
    // @ts-expect-error shape refinements cannot produce assertion-level violations
    assertType<ShapeRefinementViolationInput<'length.min'>>({ code: 'length.min', args: [3] })
    // @ts-expect-error shape refinements always use the shape constraint name
    assertType<ShapeRefinementViolationInput<'app.user.conflict'>>({ code: 'app.user.conflict', args: ['u1'] })
    assertType<ShapeRefinementViolationInput<'legacy.only-code'>>({ code: 'legacy.only-code' })
    assertType<ShapeRefinementViolationInput<'custom.unregistered'>>({ code: 'custom.unregistered' })
    assertType<ShapeRefinementViolationInput<readonly [id: string]>>({ code: 'custom.unregistered', args: ['u1'] })
  })

  test('checks inferred sync and async refinement contracts', async () => {
    const profile = shape({ login: isString })
    // @ts-expect-error inferred registered issue is missing required arguments
    profile.refine.sync(() => ({ code: 'shape.account.locked' }))
    // @ts-expect-error async inferred registered issue has invalid argument types
    profile.refine(async () => ({ code: 'shape.account.locked', args: ['later', '/recover'] }))
    // @ts-expect-error descriptor overload must check the same contract
    profile.refine.sync(() => [{ code: 'shape.account.locked' }], { kind: 'locked' })
    // @ts-expect-error async descriptor overload must check the same contract
    profile.refine(async () => [{ code: 'shape.account.locked' }], { kind: 'locked' })

    // @ts-expect-error inferred codes must agree with the runtime origin and name
    profile.refine.sync(() => ({ code: 'app.user.conflict', args: ['u1'] }))
    // @ts-expect-error one invalid member makes the inferred issue union invalid
    profile.refine.sync(value => value.login ? { code: 'shape.password.mismatch' } : { code: 'shape.account.locked' })

    profile.refine.sync(() => [{ code: 'shape.optional-context' }, { code: 'shape.labels' }])
    profile.refine.sync(() => ({ code: 'legacy.only-code' }))
    profile.refine.sync(() => ({ code: 'custom.unregistered', args: ['context'] }))

    const sync = profile.refine.sync(value => value.login ? null : [
      { code: 'shape.account.locked', args: [60, '/recover'] },
      { code: 'shape.password.mismatch' },
    ])
    const async = profile.refine(async value => value.login ? undefined : {
      code: 'shape.account.locked', args: [60, '/recover'],
    })
    for (const result of [validate.sync({}, sync), await validate({}, async)]) {
      if (!result[0]) {
        for (const violation of result[2]) {
          if (violation.violates.code === 'shape.account.locked') {
            assertType<'shape'>(violation.violates.name)
            assertType<readonly [retryAt: number, recoveryUrl: string]>(violation.violates.args)
          }
        }
      }
    }
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
