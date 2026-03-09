import type {
  Violation,
  ViolationSubject,
} from '@/index'

import {
  describe,
  expect,
  test,
} from 'vitest'

import {
  collection,
  validate,
} from '@/index'
import { shape } from '@/combinators'
import { isString } from '@/assertions'

const assertionSubject = <C extends string, A extends readonly unknown[] = readonly unknown[]>(
  name: string,
  code: C,
  args: A = [] as unknown as A
): ViolationSubject<A, 'assertion', C> => ({ kind: 'assertion', name, code, args }) as unknown as ViolationSubject<
  A,
  'assertion',
  C
>
const validatorSubject = <C extends string, A extends readonly unknown[] = readonly unknown[]>(
  name: string,
  code: C,
  args: A = [] as unknown as A
): ViolationSubject<A, 'validator', C> => ({ kind: 'validator', name, code, args }) as unknown as ViolationSubject<
  A,
  'validator',
  C
>

describe('collection', () => {
  test('supports iteration, forEach and map while preserving order', () => {
    const violations = [{
      value: '',
      path: ['email'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: 1,
      path: ['age'],
      violates: assertionSubject('isNumber', 'type.number'),
    }] satisfies Violation[]

    const errors = collection(violations)
    const seen: string[] = []
    const collections: unknown[] = []

    errors.forEach((violation, index, current) => {
      seen.push(`${index}:${violation.violates.code}`)
      collections.push(current)
    })

    expect(errors.size).toBe(2)
    expect(Array.from(errors)).toEqual(violations)
    expect(seen).toEqual(['0:type.string', '1:type.number'])
    expect(collections.every(current => current === errors)).toBe(true)
    expect(errors.map(violation => violation.violates.code)).toEqual(['type.string', 'type.number'])
  })

  test('maps violations into meaningful english text through a user callback', () => {
    const violations = [{
      value: {
        password: 'secret',
        confirmPassword: 'other',
      },
      path: [],
      violates: validatorSubject('shape', 'password.mismatch'),
    }, {
      value: '',
      path: ['profile', 'email'],
      violates: assertionSubject('isString', 'type.string'),
    }] satisfies Violation[]

    const messages = collection(violations).map(violation => {
      const location = violation.path && violation.path.length > 0
        ? violation.path.map(String).join('.')
        : 'form'

      switch (violation.violates.code) {
        case 'password.mismatch':
          return 'Form passwords must match.'
        case 'type.string':
          return `${location} must be a string.`
        default:
          return `${location} is invalid.`
      }
    })

    expect(messages).toEqual([
      'Form passwords must match.',
      'profile.email must be a string.',
    ])
  })

  test('selects only exact path matches and treats missing paths as root-level violations', () => {
    const rootWithoutPath = {
      value: { form: true },
      violates: validatorSubject('shape', 'shape.root'),
    }
    const violations = [
      rootWithoutPath,
      {
        value: { form: true },
        path: [],
        violates: validatorSubject('shape', 'shape.root.explicit'),
      },
      {
        value: 'bad',
        path: ['profile'],
        violates: validatorSubject('shape', 'shape.profile'),
      },
      {
        value: '',
        path: ['profile', 'email'],
        violates: assertionSubject('isString', 'type.string'),
      },
    ] satisfies Violation[]

    const errors = collection(violations)

    expect(Array.from(errors.at([]))).toEqual([
      rootWithoutPath,
      violations[1],
    ])
    expect(errors.at(['profile']).map(violation => violation.violates.code)).toEqual(['shape.profile'])
    expect(errors.at(['profile', 'email']).map(violation => violation.violates.code)).toEqual(['type.string'])
    expect(errors.at(['missing']).size).toBe(0)
  })

  test('treats runtime undefined lookup as root path and rejects parent lookups from child nodes', () => {
    const violations = [{
      value: { form: true },
      path: [],
      violates: validatorSubject('shape', 'shape.root'),
    }, {
      value: '',
      path: ['profile', 'email'],
      violates: assertionSubject('isString', 'type.string'),
    }] satisfies Violation[]

    const errors = collection(violations)
    const email = errors.tree().at(['profile', 'email'])

    expect(Array.from(errors.at(undefined as unknown as readonly PropertyKey[]))).toEqual([violations[0]])
    expect(email?.at([])).toBeUndefined()
  })

  test('builds a tree with root errors, intermediate nodes and numeric indices', () => {
    const violations = [{
      value: { id: 'broken' },
      path: [],
      violates: validatorSubject('shape', 'shape.root'),
    }, {
      value: '',
      path: ['profile', 'email'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: '',
      path: ['profile', 'address', 'zip'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: '',
      path: ['items', 0, 'name'],
      violates: assertionSubject('isString', 'type.string'),
    }, {
      value: 'x',
      path: ['items', 1],
      violates: assertionSubject('isNumber', 'type.number'),
    }] satisfies Violation[]

    const tree = collection(violations).tree()
    const profile = tree.at(['profile'])
    const address = tree.at(['profile', 'address'])
    const items = tree.at(['items'])

    expect(tree.at([])).toBe(tree)
    expect(tree.path).toEqual([])
    expect(tree.self.map(violation => violation.violates.code)).toEqual(['shape.root'])
    expect(tree.subtree.size).toBe(5)
    expect(Array.from(tree.children.keys())).toEqual(['profile', 'items'])

    expect(profile?.path).toEqual(['profile'])
    expect(profile?.self.size).toBe(0)
    expect(profile?.subtree.map(violation => violation.violates.code)).toEqual(['type.string', 'type.string'])

    expect(address?.path).toEqual(['profile', 'address'])
    expect(address?.self.size).toBe(0)
    expect(address?.subtree.map(violation => violation.path)).toEqual([['profile', 'address', 'zip']])

    expect(items?.children.has(0)).toBe(true)
    expect(items?.children.has(1)).toBe(true)
    expect(Array.from(items?.children.keys() ?? [])).toEqual([0, 1])
    expect(items?.at(['items', 0, 'name'])?.self.map(violation => violation.violates.code)).toEqual(['type.string'])
    expect(profile?.at(['items'])).toBeUndefined()
    expect(tree.at(['missing'])).toBeUndefined()
  })

  test('works with validate.sync output for root-level object violations', () => {
    const schema = shape({
      password: isString,
      confirmPassword: isString,
    }).refine(() => ({
      code: 'password.mismatch',
    }))

    const [, , violations] = validate.sync({
      password: 'secret',
      confirmPassword: 'secret',
    }, schema)

    const errors = collection(violations)

    expect(errors.at([]).map(violation => violation.violates.code)).toEqual(['password.mismatch'])
    expect(errors.tree().self.map(violation => violation.violates.code)).toEqual(['password.mismatch'])
  })
})
