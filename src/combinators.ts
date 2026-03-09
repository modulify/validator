import type {
  Constraint,
  DiscriminatedUnionValidator,
  EachValidator,
  FieldsMatchObjectShapeRuleDescriptor,
  GenericObjectShapeRuleDescriptor,
  InferConstraints,
  MaybeMany,
  NullableValidator,
  NullishValidator,
  ObjectShapeFieldSelector,
  ObjectShapeRefinement,
  ObjectShapeRefinementIssue,
  ObjectShapeRuleDescriptor,
  MergeObjectDescriptors,
  ObjectShape,
  OptionalValidator,
  PartialObjectDescriptor,
  RecordValidator,
  TupleValidator,
  UnknownKeysMode,
  UnionValidator,
  Validate,
  ValidateSync,
  Validation,
  Violation,
  Validator,
} from '~types'

import { assert } from '@/assert'
import {
  arrayify,
  matchesConstraints,
} from '@/constraints'
import {
  attachConstraintDescriptor,
  describe,
  describeConstraints,
} from '@/metadata'
import {
  isArray,
  isExact,
  isNull,
  isRecord,
  isUndefined,
} from '@/predicates'

export type ShapeDescriptor = Record<PropertyKey, MaybeMany<Constraint>>

export type InferShape<D extends ShapeDescriptor> = {
  [K in keyof D]: InferConstraints<D[K]>
}

export type {
  ObjectShapeFieldSelector,
  ObjectShape,
  ObjectShapeRefinement,
  ObjectShapeRefinementIssue,
  UnknownKeysMode,
} from '~types'

type InferTuple<T extends readonly MaybeMany<Constraint>[]> = {
  -readonly [K in keyof T]: InferConstraints<T[K]>
}

type InferUnion<T extends readonly MaybeMany<Constraint>[]> = {
  [K in keyof T]: InferConstraints<T[K]>
}[number]

type VariantMap = Record<PropertyKey, MaybeMany<Constraint>>

type InferDiscriminatedUnion<T extends VariantMap> = {
  [K in keyof T]: InferConstraints<T[K]>
}[keyof T]

type StrictObjectShape<
  D extends ShapeDescriptor,
  R extends readonly ObjectShapeRuleDescriptor[] = readonly ObjectShapeRuleDescriptor[],
  RI extends ObjectShapeRefinementIssue = never,
> = ObjectShape<D, 'strict', R, RI>

type PassthroughObjectShape<
  D extends ShapeDescriptor,
  R extends readonly ObjectShapeRuleDescriptor[] = readonly ObjectShapeRuleDescriptor[],
  RI extends ObjectShapeRefinementIssue = never,
> = ObjectShape<D, 'passthrough', R, RI>

type ShapeRefinement<
  T,
  I extends ObjectShapeRefinementIssue = ObjectShapeRefinementIssue,
> = ObjectShapeRefinement<T, I>

const describeConstraintMap = <T extends Record<PropertyKey, MaybeMany<Constraint>>>(
  constraints: T
): Record<PropertyKey, ReturnType<typeof describe>> => {
  const described = {} as Record<PropertyKey, ReturnType<typeof describe>>

  Reflect.ownKeys(constraints).forEach(key => {
    described[key] = describeConstraints(constraints[key as keyof T])
  })

  return described
}

const normalizeRuleDescriptor = <const R extends GenericObjectShapeRuleDescriptor<string>>(descriptor: R): R => {
  if (!descriptor.metadata) {
    return descriptor
  }

  return {
    ...descriptor,
    metadata: Object.freeze({ ...descriptor.metadata }),
  }
}

const passthrough = <const C extends MaybeMany<Constraint>, Accepted>(
  kind: 'optional' | 'nullable' | 'nullish',
  accepts: (value: unknown) => value is Accepted,
  constraints: C
): Validator<InferConstraints<C> | Accepted> => attachConstraintDescriptor({
  check(value: unknown): value is InferConstraints<C> | Accepted {
    return accepts(value) || matchesConstraints(value, constraints)
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    return accepts(value)
      ? []
      : [validate(value, constraints, path) as Validation<F>]
  },
}, () => ({
  kind,
  child: describeConstraints(constraints),
}))

const keysOf = <T extends object>(value: T) => Object.keys(value) as Array<keyof T>

const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)

const hasUnknownKeys = <D extends ShapeDescriptor>(value: Record<PropertyKey, unknown>, descriptor: D) =>
  Object.keys(value).some(key => !hasOwn(descriptor, key))

const collectUnknownKeyViolations = (
  value: Record<PropertyKey, unknown>,
  path: PropertyKey[],
  descriptor: ShapeDescriptor
) => Object.keys(value)
  .filter(key => !hasOwn(descriptor, key))
  .map(key => [{
    value: value[key],
    path: [...path, key],
    violates: { kind: 'validator', name: 'shape', code: 'shape.unknown-key', args: [] },
  }])

const pickDescriptor = <
  D extends ShapeDescriptor,
  const K extends readonly (keyof D)[],
>(descriptor: D, keys: K): Pick<D, K[number]> => {
  const picked = {} as Pick<D, K[number]>

  keys.forEach(key => {
    if (hasOwn(descriptor, key)) {
      picked[key] = descriptor[key]
    }
  })

  return picked
}

const omitDescriptor = <
  D extends ShapeDescriptor,
  const K extends readonly (keyof D)[],
>(descriptor: D, keys: K): Omit<D, K[number]> => {
  const omitted = { ...descriptor } as D

  keys.forEach(key => {
    delete omitted[key]
  })

  return omitted as Omit<D, K[number]>
}

const extendDescriptor = <
  D extends ShapeDescriptor,
  E extends ShapeDescriptor,
>(descriptor: D, extension: E): MergeObjectDescriptors<D, E> => ({
  ...descriptor,
  ...extension,
}) as MergeObjectDescriptors<D, E>

const partialDescriptor = <D extends ShapeDescriptor>(descriptor: D): PartialObjectDescriptor<D> => {
  const partial = {} as PartialObjectDescriptor<D>

  keysOf(descriptor).forEach(key => {
    partial[key] = optional(descriptor[key])
  })

  return partial
}

const getPathValue = (value: unknown, path: readonly PropertyKey[]) => path.reduce<unknown>((current, key) => {
  if (current === null || current === undefined) {
    return undefined
  }

  return Reflect.get(Object(current), key)
}, value)

const toPath = (selector: ObjectShapeFieldSelector): PropertyKey[] => Array.isArray(selector)
  ? [...selector]
  : [selector]

const collectShapeRefinementViolations = <
  D extends ShapeDescriptor,
  RI extends ObjectShapeRefinementIssue,
>(
  value: InferShape<D>,
  path: PropertyKey[],
  refinements: readonly ShapeRefinement<InferShape<D>, RI>[]
) => refinements.flatMap(refinement => {
  const result = refinement(value)

  if (result === null || result === undefined) {
    return []
  }

  return arrayify(result)
    .filter((issue): issue is RI => issue !== null && issue !== undefined)
    .map(issue => {
      const issuePath = issue.path ? [...issue.path] : []

      return {
        value: issue.value ?? getPathValue(value, issuePath),
        path: [...path, ...issuePath],
        violates: {
          kind: 'validator' as const,
          name: 'shape',
          code: issue.code,
          args: issue.args ?? [],
        },
      }
    })
})

const createObjectShape = <
  const D extends ShapeDescriptor,
  const M extends UnknownKeysMode,
  const R extends readonly ObjectShapeRuleDescriptor[],
  RI extends ObjectShapeRefinementIssue = never,
>(
  descriptor: D,
  unknownKeys: M,
  refinements: readonly ShapeRefinement<InferShape<D>, RI>[],
  rules: R
): ObjectShape<D, M, R, RI> => {
  const keys = keysOf(descriptor)

  return attachConstraintDescriptor({
    descriptor,
    unknownKeys,
    check(value: unknown): value is InferShape<D> {
      return isRecord(value)
        && keys.every(key => matchesConstraints(value[key], descriptor[key]))
        && (unknownKeys === 'passthrough' || !hasUnknownKeys(value, descriptor))
        && collectShapeRefinementViolations(value as InferShape<D>, [], refinements).length === 0
    },
    run<F extends Validate | ValidateSync>(
      validate: F,
      value: unknown,
      path: PropertyKey[]
    ): Validation<F>[] {
      if (!isRecord(value)) {
        return [[{
          value,
          path,
          violates: { kind: 'validator', name: 'shape', code: 'type.record', args: [] },
        }]] as Validation<F>[]
      }

      const validations = keys.reduce<Validation<F>[]>((all, key) => [
        ...all,
        validate(value[key], descriptor[key], [...path, key]) as Validation<F>,
      ], [])

      if (unknownKeys === 'strict') {
        validations.push(...collectUnknownKeyViolations(value, path, descriptor) as Validation<F>[])
      }

      if (validations.some(validation => validation instanceof Promise)) {
        return [Promise.all(validations.map(validation => Promise.resolve(validation))).then(results => {
          const structuralViolations = results.flat()

          return structuralViolations.length > 0
            ? structuralViolations
            : collectShapeRefinementViolations(value as InferShape<D>, path, refinements)
        }) as Validation<F>]
      }

      const structuralViolations = (validations as Violation[][]).flat()

      return structuralViolations.length > 0
        ? validations
        : [collectShapeRefinementViolations(value as InferShape<D>, path, refinements) as Validation<F>]
    },
    refine<
      const I extends ObjectShapeRefinementIssue = ObjectShapeRefinementIssue,
      const RD extends GenericObjectShapeRuleDescriptor<string> = GenericObjectShapeRuleDescriptor<'refine'>
    >(
      refinement: ShapeRefinement<InferShape<D>, I>,
      ruleDescriptor: RD = { kind: 'refine' } as RD
    ) {
      return createObjectShape<D, M, [...R, RD], RI | I>(
        descriptor,
        unknownKeys,
        [...refinements, refinement] as readonly ShapeRefinement<InferShape<D>, RI | I>[],
        [...rules, normalizeRuleDescriptor(ruleDescriptor)] as [...R, RD]
      )
    },
    fieldsMatch<const K extends readonly [ObjectShapeFieldSelector, ObjectShapeFieldSelector]>(selectedKeys: K) {
      const [left, right] = selectedKeys
      const leftPath = toPath(left)
      const rightPath = toPath(right)
      const ruleDescriptor = {
        kind: 'fieldsMatch',
        selectors: [left, right],
      } as FieldsMatchObjectShapeRuleDescriptor<K[0], K[1]>

      return createObjectShape<
        D,
        M,
        [...R, FieldsMatchObjectShapeRuleDescriptor<K[0], K[1]>],
        RI | ObjectShapeRefinementIssue<'shape.fields.mismatch'>
      >(
        descriptor,
        unknownKeys,
        [...refinements, value => {
          return getPathValue(value, leftPath) === getPathValue(value, rightPath)
            ? []
            : [{
              path: rightPath,
              code: 'shape.fields.mismatch',
              args: [selectedKeys],
            }]
        }] as readonly ShapeRefinement<
          InferShape<D>,
          RI | ObjectShapeRefinementIssue<'shape.fields.mismatch'>
        >[],
        [...rules, ruleDescriptor] as [...R, FieldsMatchObjectShapeRuleDescriptor<K[0], K[1]>]
      )
    },
    strict(): StrictObjectShape<D, R, RI> {
      return createObjectShape(descriptor, 'strict', refinements, rules)
    },
    passthrough(): PassthroughObjectShape<D, R, RI> {
      return createObjectShape(descriptor, 'passthrough', refinements, rules)
    },
    pick<const K extends readonly (keyof D)[]>(selectedKeys: K) {
      return createObjectShape(pickDescriptor(descriptor, selectedKeys), unknownKeys, [], [])
    },
    omit<const K extends readonly (keyof D)[]>(selectedKeys: K) {
      return createObjectShape(omitDescriptor(descriptor, selectedKeys), unknownKeys, [], [])
    },
    partial() {
      return createObjectShape(partialDescriptor(descriptor), unknownKeys, [], [])
    },
    extend<const E extends ShapeDescriptor>(extension: E) {
      return createObjectShape(extendDescriptor(descriptor, extension), unknownKeys, [], [])
    },
    merge<const E extends ShapeDescriptor, OM extends UnknownKeysMode, OR extends readonly ObjectShapeRuleDescriptor[]>(
      shape: ObjectShape<E, OM, OR, ObjectShapeRefinementIssue>
    ) {
      return createObjectShape(extendDescriptor(descriptor, shape.descriptor), unknownKeys, [], [])
    },
  }, () => ({
    kind: 'shape',
    unknownKeys,
    fields: describeConstraintMap(descriptor),
    rules,
  }))
}

const toUnionFailure = (
  branches: readonly MaybeMany<Constraint>[],
  value: unknown,
  path: PropertyKey[],
  branchResults: Validation<ValidateSync>[]
) => {
  const matched = branchResults.find(result => result.length === 0)

  if (matched) {
    return matched
  }

  return [{
    value,
    path,
    violates: { kind: 'validator', name: 'union', code: 'union.no-match', args: [branches.length] },
  }, ...branchResults.flat()]
}

const collectUnionViolations = (
  branches: readonly MaybeMany<Constraint>[],
  validate: Validate | ValidateSync,
  value: unknown,
  path: PropertyKey[]
) => {
  const branchResults = branches.map(branch => validate(value, branch, path))

  if (branchResults.some(result => result instanceof Promise)) {
    return Promise.all(branchResults.map(result => Promise.resolve(result))).then(results => {
      return toUnionFailure(branches, value, path, results)
    })
  }

  return toUnionFailure(branches, value, path, branchResults as Validation<ValidateSync>[])
}

export const each = <const C extends MaybeMany<Constraint>>(constraints: C): EachValidator<C> => attachConstraintDescriptor({
  check(value: unknown): value is InferConstraints<C>[] {
    return isArray(value) && value.every(item => matchesConstraints(item, constraints))
  },
  run <F extends Validate | ValidateSync> (
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    return isArray(value)
      ? value.map((item, index) => validate(item, constraints, [...path, index])) as Validation<F>[]
      : [[{
        value,
        path,
        violates: { kind: 'validator', name: 'each', code: 'type.array', args: [] },
      }]] as Validation<F>[]
  },
} as EachValidator<C>, () => ({
  kind: 'each',
  item: describeConstraints(constraints),
}))

export const tuple = <const T extends readonly MaybeMany<Constraint>[]>(constraints: T): TupleValidator<T> => attachConstraintDescriptor({
  check(value: unknown): value is InferTuple<T> {
    return isArray(value)
      && value.length === constraints.length
      && constraints.every((constraint, index) => matchesConstraints(value[index], constraint))
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    if (!isArray(value)) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'tuple', code: 'type.array', args: [] },
      }]] as Validation<F>[]
    }

    if (value.length !== constraints.length) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'tuple', code: 'tuple.length', args: [constraints.length] },
      }]] as Validation<F>[]
    }

    return constraints.map((constraint, index) => validate(value[index], constraint, [...path, index]) as Validation<F>)
  },
} as TupleValidator<T>, () => ({
  kind: 'tuple',
  items: constraints.map(constraint => describeConstraints(constraint)),
}))

export const union = <const T extends readonly MaybeMany<Constraint>[]>(constraints: T): UnionValidator<T> => attachConstraintDescriptor({
  check(value: unknown): value is InferUnion<T> {
    return constraints.some(constraint => matchesConstraints(value, constraint))
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    return [collectUnionViolations(constraints, validate, value, path) as Validation<F>]
  },
} as UnionValidator<T>, () => ({
  kind: 'union',
  branches: constraints.map(constraint => describeConstraints(constraint)),
}))

export const discriminatedUnion = <
  const K extends PropertyKey,
  const T extends VariantMap,
>(key: K, variants: T): DiscriminatedUnionValidator<K, T> => attachConstraintDescriptor({
  check(value: unknown): value is InferDiscriminatedUnion<T> {
    if (!isRecord(value)) {
      return false
    }

    const discriminator = value[key]

    return Object.prototype.hasOwnProperty.call(variants, discriminator)
      && matchesConstraints(value, variants[discriminator as keyof T])
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    if (!isRecord(value)) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'discriminatedUnion', code: 'type.record', args: [] },
      }]] as Validation<F>[]
    }

    const discriminator = value[key]

    if (!Object.prototype.hasOwnProperty.call(variants, discriminator)) {
      return [[{
        value: discriminator,
        path: [...path, key],
        violates: {
          kind: 'validator',
          name: 'discriminatedUnion',
          code: 'union.invalid-discriminator',
          args: [Reflect.ownKeys(variants)],
        },
      }]] as Validation<F>[]
    }

    return [validate(value, variants[discriminator as keyof T], path) as Validation<F>]
  },
} as DiscriminatedUnionValidator<K, T>, () => ({
  kind: 'discriminatedUnion',
  key,
  variants: describeConstraintMap(variants),
}))

export const record = <const C extends MaybeMany<Constraint>>(constraints: C): RecordValidator<C> => attachConstraintDescriptor({
  check(value: unknown): value is Record<string, InferConstraints<C>> {
    return isRecord(value) && Object.values(value).every(item => matchesConstraints(item, constraints))
  },
  run<F extends Validate | ValidateSync>(
    validate: F,
    value: unknown,
    path: PropertyKey[]
  ): Validation<F>[] {
    if (!isRecord(value)) {
      return [[{
        value,
        path,
        violates: { kind: 'validator', name: 'record', code: 'type.record', args: [] },
      }]] as Validation<F>[]
    }

    return Object.keys(value).map(key => validate(value[key], constraints, [...path, key]) as Validation<F>)
  },
} as RecordValidator<C>, () => ({
  kind: 'record',
  values: describeConstraints(constraints),
}))

export const shape = <const D extends ShapeDescriptor>(descriptor: D): ObjectShape<D, 'passthrough', [], never> => {
  return createObjectShape(descriptor, 'passthrough', [], [])
}

export const exact = <const T>(value: T) => assert(isExact(value), {
  name: 'exact',
  bail: true,
  code: 'value.exact',
  args: [value],
})

export const optional = <const C extends MaybeMany<Constraint>>(constraints: C): OptionalValidator<C> => passthrough(
  'optional',
  isUndefined,
  constraints
) as OptionalValidator<C>

export const nullable = <const C extends MaybeMany<Constraint>>(constraints: C): NullableValidator<C> => passthrough(
  'nullable',
  isNull,
  constraints
) as NullableValidator<C>

export const nullish = <const C extends MaybeMany<Constraint>>(constraints: C): NullishValidator<C> => passthrough(
  'nullish',
  (value: unknown): value is null | undefined => isNull(value) || isUndefined(value),
  constraints
) as NullishValidator<C>
