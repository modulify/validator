import type {
  Constraint,
  InferConstraints,
  InferViolations,
  MaybeMany,
  Recursive,
  ValidationResult,
  Violation,
} from '~types'

export * from '@/assertions'
export * from '@/combinators'
export {
  collection,
  ViolationCollection,
} from '@/violations'
export {
  custom,
  describe,
  meta,
} from '@/metadata'
export type {
  AllOfConstraintDescriptor,
  AssertionDescriptor,
  AssertionConstraintDescriptor,
  AsyncObjectShapeRuleDescriptor,
  BaseConstraintDescriptor,
  Constraint,
  ConstraintDescriptor,
  ConstraintMetadata,
  CustomConstraintDescriptor,
  DescribeAssertionConstraint,
  DescribeAssertionConstraintTuple,
  DescribeConstraint,
  DescribeConstraintTuple,
  DescribeConstraints,
  DescribeShapeDescriptor,
  DescribedValidator,
  DiscriminatedUnionValidator,
  EachValidator,
  FieldsMatchObjectShapeRuleDescriptor,
  InferShape,
  InferConstraint,
  InferConstraints,
  InferConstraintViolations,
  InferViolations,
  MergeShapeDescriptors,
  OpaqueValidatorDescriptor,
  PartialShapeDescriptor,
  DiscriminatedUnionConstraintDescriptor,
  EachConstraintDescriptor,
  NullableValidator,
  NullishValidator,
  KnownViolationCode,
  KnownViolationSubject,
  ObjectShapeRuleDescriptor,
  ObjectShapeRuleDescriptorBase,
  OptionalValidator,
  RecordValidator,
  RecordConstraintDescriptor,
  ShapeDescriptor,
  ShapeFieldSelector,
  ShapeRefinement,
  ShapeRefineMethod,
  ShapeRefineMethodSync,
  ShapeRefinementViolationInput,
  ShapeConstraintDescriptor,
  SyncObjectShapeRuleDescriptor,
  SyncShapeRefinement,
  TupleValidator,
  TupleConstraintDescriptor,
  UnionValidator,
  ValidationFailure,
  ValidationSuccess,
  ViolationArgs,
  ViolationCode,
  ViolationCodeEntry,
  ViolationCodeRegistry,
  ViolationEntry,
  ViolationKind,
  ViolationKindOf,
  ViolationNameOf,
  ViolationSubject,
  ViolationTreeNode,
  UnionConstraintDescriptor,
  ValidationResult,
  Validator,
  Violation,
  WrapperConstraintDescriptor,
} from '~types'

import {
  arrayify,
  isValidator,
} from '@/constraints'

const collectViolations = async (
  value: unknown,
  constraints: MaybeMany<Constraint>,
  path: PropertyKey[] = []
): Promise<Violation[]> => {
  const validations: Promise<Violation[]>[] = []

  for (const c of arrayify(constraints)) {
    if (isValidator(c)) {
      validations.push(...c.run(collectViolations, value, path).map(v => v instanceof Promise ? v : Promise.resolve(v)))
      continue
    }

    const v = c(value)
    if (v instanceof Promise) {
      if (c.bail) {
        const awaited = await v
        if (awaited) {
          validations.push(Promise.resolve([Object.assign(awaited, { path: [...path] })]))
          break
        }
      } else {
        validations.push(v.then(v => v ? [Object.assign(v, { path: [...path] })] : []))
      }
    } else if (v) {
      validations.push(Promise.resolve([Object.assign(v, { path: [...path] })]))

      if (c.bail) {
        break
      }
    }
  }

  return settle(value, path, validations)
}

collectViolations.sync = false as const

const collectViolationsSync = (
  value: unknown,
  constraints: MaybeMany<Constraint>,
  path: PropertyKey[] = []
): Violation[] => {
  const violations: Recursive<Violation>[] = []

  for (const c of arrayify(constraints)) {
    if (isValidator(c)) {
      violations.push(...c.run(collectViolationsSync, value, path))
      continue
    }

    const v = c(value)
    if (v instanceof Promise) {
      throw new Error('Found asynchronous validator ' + String(c.name))
    } else if (v) {
      violations.push(Object.assign(v, { path: [...path] }))

      if (c.bail) break
    }
  }

  return flatten(violations) as Violation[]
}

collectViolationsSync.sync = true as const

function toResult<T, V extends Violation>(value: unknown, violations: V[]): ValidationResult<T, V> {
  return violations.length === 0
    ? [true, value as T, []]
    : [false, value, violations]
}

function flatten<T>(recursive: Recursive<T>[]): T[] {
  const flattened: T[] = []
  recursive.forEach(element => {
    flattened.push(...(
      Array.isArray(element)
        ? flatten(element)
        : [element]
    ))
  })

  return flattened
}

async function settle (value: unknown, path: PropertyKey[], validations: Promise<Violation[]>[]) {
  const violations: Violation[] = []

  const settled = await Promise.allSettled(validations)

  settled.forEach(result => {
    if (result.status === 'fulfilled') {
      violations.push(...result.value)
    } else {
      violations.push({
        value,
        path,
        violates: { kind: 'runtime', name: 'validate', code: 'runtime.rejection', args: [result.reason] },
      })
    }
  })

  return violations
}

export const matches = {
  sync<const C extends MaybeMany<Constraint>>(value: unknown, constraints: C): value is InferConstraints<C> {
    return collectViolationsSync(value, constraints).length === 0
  },
}

export const validate = Object.assign(
  async <const C extends MaybeMany<Constraint>>(
    value: unknown,
    constraints: C
  ): Promise<ValidationResult<InferConstraints<C>, InferViolations<C>>> => {
    const violations = await collectViolations(value, constraints)

    return toResult<InferConstraints<C>, InferViolations<C>>(
      value,
      violations as InferViolations<C>[]
    )
  },
  {
    sync<const C extends MaybeMany<Constraint>>(
      value: unknown,
      constraints: C
    ): ValidationResult<InferConstraints<C>, InferViolations<C>> {
      const violations = collectViolationsSync(value, constraints)

      return toResult<InferConstraints<C>, InferViolations<C>>(
        value,
        violations as InferViolations<C>[]
      )
    },
  }
)
