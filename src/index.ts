import type {
  Assertion,
  MaybeMany,
  Recursive,
  Validator,
  Violation,
} from '~types'

export * from '@/assertions'
export * from '@/runners'

const isRunner = (c: Assertion | Validator): c is Validator => 'run' in c

const _validate = async <T> (
  value: T,
  constraints: MaybeMany<Assertion | Validator>,
  path: PropertyKey[] = []
): Promise<Violation[]> => {
  const validations: Promise<Violation[]>[] = []

  for (const c of arraify(constraints)) {
    if (isRunner(c)) {
      validations.push(...c.run(_validate, value, path).map(v => v instanceof Promise ? v : Promise.resolve(v)))
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

const _sync = <T>(
  value: T,
  constraints: MaybeMany<Assertion | Validator>,
  path: PropertyKey[] = []
): Violation[] => {
  const violations: Recursive<Violation>[] = []

  for (const c of arraify(constraints)) {
    if (isRunner(c)) {
      violations.push(...c.run(_sync, value, path))
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
        violates: { predicate: 'settle', rule: 'reject', args: [result.reason] },
      })
    }
  })

  return violations
}
