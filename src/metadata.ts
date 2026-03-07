import type {
  Assertion,
  Constraint,
  ConstraintDescriptor,
  ConstraintMetadata,
  MaybeMany,
} from '~types'

import {
  arrayify,
  isValidator,
} from '@/constraints'

type DescriptorFactory = () => ConstraintDescriptor

type ConstraintWithIntrospection = Constraint & {
  [constraintDescriptorSymbol]?: DescriptorFactory;
  [constraintMetadataSymbol]?: ConstraintMetadata;
}

const constraintDescriptorSymbol = Symbol('modulify.validator.descriptor')
const constraintMetadataSymbol = Symbol('modulify.validator.metadata')

const cloneCallableConstraint = <C extends Constraint>(constraint: C): C => {
  const source = constraint as Assertion
  const cloned = ((value: unknown) => source(value)) as C
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    length: _length,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    name: _name,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prototype: _prototype,
    ...descriptors
  } = Object.getOwnPropertyDescriptors(source)

  Object.defineProperties(cloned as object, descriptors)

  try {
    Object.defineProperty(cloned, 'name', {
      configurable: true,
      value: source.name,
    })
  } catch {
    // Ignore environments where function names cannot be redefined.
  }

  Object.setPrototypeOf(cloned, Object.getPrototypeOf(source))

  return cloned
}

const cloneConstraint = <C extends Constraint>(constraint: C): C => {
  if (typeof constraint === 'function') {
    return cloneCallableConstraint(constraint)
  }

  return Object.create(
    Object.getPrototypeOf(constraint),
    Object.getOwnPropertyDescriptors(constraint)
  ) as C
}

const freezeMetadata = (metadata: Record<string, unknown>): ConstraintMetadata => Object.freeze({ ...metadata })

const getConstraintMetadata = (constraint: Constraint): ConstraintMetadata | undefined => {
  return (constraint as ConstraintWithIntrospection)[constraintMetadataSymbol]
}

const getDescriptorFactory = (constraint: Constraint): DescriptorFactory | undefined => {
  return (constraint as ConstraintWithIntrospection)[constraintDescriptorSymbol]
}

const inferAssertionDescriptor = (assertion: Assertion): ConstraintDescriptor => ({
  kind: 'assertion',
  name: assertion.name,
  bail: assertion.bail,
  constraints: assertion.constraints.map(([, , code, ...args]) => ({
    code,
    args,
  })),
})

const withMetadata = (
  descriptor: ConstraintDescriptor,
  metadata: ConstraintMetadata | undefined
): ConstraintDescriptor => {
  if (!metadata) {
    return descriptor
  }

  return {
    ...descriptor,
    metadata,
  }
}

export const attachConstraintDescriptor = <C extends Constraint>(
  constraint: C,
  describe: DescriptorFactory
): C => {
  Object.defineProperty(constraint, constraintDescriptorSymbol, {
    configurable: false,
    enumerable: false,
    value: describe,
    writable: false,
  })

  return constraint
}

export const meta = <const C extends Constraint, const M extends ConstraintMetadata>(
  constraint: C,
  metadata: M
): C => {
  const cloned = cloneConstraint(constraint) as ConstraintWithIntrospection
  const nextMetadata = freezeMetadata({
    ...(getConstraintMetadata(constraint) ?? {}),
    ...metadata,
  })

  Object.defineProperty(cloned, constraintMetadataSymbol, {
    configurable: true,
    enumerable: false,
    value: nextMetadata,
    writable: false,
  })

  return cloned as C
}

export const describeConstraints = <const C extends MaybeMany<Constraint>>(constraints: C): ConstraintDescriptor => {
  const values = arrayify(constraints)

  return values.length === 1
    ? describe(values[0] as Constraint)
    : {
      kind: 'allOf',
      constraints: values.map(value => describe(value)),
    }
}

export const describe = <const C extends Constraint>(constraint: C): ConstraintDescriptor => {
  const factory = getDescriptorFactory(constraint)
  const metadata = getConstraintMetadata(constraint)

  if (factory) {
    return withMetadata(factory(), metadata)
  }

  if (isValidator(constraint)) {
    return withMetadata({ kind: 'validator' }, metadata)
  }

  return withMetadata(inferAssertionDescriptor(constraint), metadata)
}
