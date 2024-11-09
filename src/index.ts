import type {
  Constraint,
  ValidationRunner,
  MaybeMany,
  Recursive,
  Violation,
} from '~types'

import check from '@/assertions/check'

export * from '@/assertions'
export * from '@/runners'

const isBatch = (c: Constraint): c is ValidationRunner => {
  return 'run' in c
}

const _validate = async <T> (
  value: T,
  constraints: MaybeMany<Constraint>,
  path: PropertyKey[] = []
): Promise<Violation[]> => {
  const validations: Promise<Violation[]>[] = []

  for (const c of arraify(constraints)) {
    if (isBatch(c)) {
      validations.push(...c.run(_validate, value, path).map(v => v instanceof Promise ? v : Promise.resolve(v)))
      continue
    }

    const v = 'That' in c ? check(c, value, [...path]) : c(value, [...path])

    if (v instanceof Promise) {
      if (c.bail) {
        const awaited = await v
        if (awaited) {
          validations.push(Promise.resolve([awaited]))
          break
        }
      } else {
        validations.push(v.then(v => v ? [v] : []))
      }
    } else if (v) {
      validations.push(Promise.resolve([v]))

      if (c.bail) {
        break
      }
    }
  }

  return settle(value, path, validations)
}

const _sync = <T>(
  value: T,
  constraints: MaybeMany<Constraint>,
  path: PropertyKey[] = []
): Violation[] => {
  const violations: Recursive<Violation>[] = []

  for (const c of arraify(constraints)) {
    if (isBatch(c)) {
      violations.push(...c.run(_sync, value, path))
      continue
    }

    const v = 'That' in c ? check(c, value, [...path]) : c(value, [...path])

    if (v instanceof Promise) {
      throw new Error('Found asynchronous constraint validator ' + String(c.fqn))
    } else if (v) {
      violations.push(v)

      if (c.bail) {
        break
      }
    }
  }

  return flatten(violations) as Violation[]
}

export const validate = Object.assign(_validate, {
  sync: _sync,
})

type A<T> = T extends unknown[] ? T : T[]

function arraify <T>(value: T): A<T> {
  return Array.isArray(value)
    ? [...value] as A<T>
    : [value] as A<T>
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
        violates: '@modulify/validator',
        reason: 'reject',
        meta: result.reason,
      })
    }
  })

  return violations
}