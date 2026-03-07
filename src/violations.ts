import type { Violation } from '~types'

type ViolationPath = readonly PropertyKey[]

type ViolationTreeState<V extends Violation = Violation> = {
  readonly path: ViolationPath
  readonly self: V[]
  readonly subtree: V[]
  readonly children: Map<PropertyKey, ViolationTreeState<V>>
}

const ROOT_PATH: ViolationPath = Object.freeze([])

const normalizePath = (path?: readonly PropertyKey[]): ViolationPath => path ?? ROOT_PATH

const isSamePath = (
  left?: readonly PropertyKey[],
  right: readonly PropertyKey[] = ROOT_PATH
) => {
  const normalizedLeft = normalizePath(left)

  if (normalizedLeft.length !== right.length) {
    return false
  }

  return normalizedLeft.every((part, index) => Object.is(part, right[index]))
}

const isPathPrefix = (path: readonly PropertyKey[], prefix: readonly PropertyKey[]) => {
  if (prefix.length > path.length) {
    return false
  }

  return prefix.every((part, index) => Object.is(part, path[index]))
}

const createTreeState = <V extends Violation>(path: readonly PropertyKey[]): ViolationTreeState<V> => ({
  path: Object.freeze([...path]),
  self: [],
  subtree: [],
  children: new Map(),
})

class TreeNode<V extends Violation = Violation> {
  readonly path: readonly PropertyKey[]
  readonly self: ViolationCollection<V>
  readonly subtree: ViolationCollection<V>
  readonly children: ReadonlyMap<PropertyKey, TreeNode<V>>

  constructor(state: ViolationTreeState<V>) {
    this.path = state.path
    this.self = new ViolationCollection(state.self)
    this.subtree = new ViolationCollection(state.subtree)
    this.children = new Map(
      [...state.children.entries()].map(([key, child]) => [key, new TreeNode(child)])
    )
  }

  at(path: readonly PropertyKey[]): TreeNode<V> | undefined {
    if (!isPathPrefix(path, this.path)) {
      return undefined
    }

    if (path.length === this.path.length) {
      return this
    }

    const child = this.children.get(path[this.path.length])

    return child?.at(path)
  }
}

const buildTree = <V extends Violation>(violations: readonly V[]) => {
  const root = createTreeState<V>(ROOT_PATH)

  violations.forEach(violation => {
    const path = normalizePath(violation.path)

    root.subtree.push(violation)

    if (path.length === 0) {
      root.self.push(violation)
      return
    }

    let current = root
    const currentPath: PropertyKey[] = []

    path.forEach((segment, index) => {
      currentPath.push(segment)

      let child = current.children.get(segment)

      if (!child) {
        child = createTreeState(currentPath)
        current.children.set(segment, child)
      }

      child.subtree.push(violation)

      if (index === path.length - 1) {
        child.self.push(violation)
      }

      current = child
    })
  })

  return new TreeNode(root)
}

export class ViolationCollection<V extends Violation = Violation> implements Iterable<V> {
  readonly size: number

  private readonly violations: readonly V[]

  constructor(violations: readonly V[]) {
    this.violations = [...violations]
    this.size = this.violations.length
  }

  [Symbol.iterator](): Iterator<V> {
    return this.violations[Symbol.iterator]()
  }

  forEach(callback: (violation: V, index: number, collection: ViolationCollection<V>) => void): void {
    this.violations.forEach((violation, index) => callback(violation, index, this))
  }

  map<T>(callback: (violation: V, index: number, collection: ViolationCollection<V>) => T): T[] {
    return this.violations.map((violation, index) => callback(violation, index, this))
  }

  at(path: readonly PropertyKey[]): ViolationCollection<V> {
    return new ViolationCollection(this.violations.filter(violation => isSamePath(violation.path, path)))
  }

  tree(): TreeNode<V> {
    return buildTree(this.violations)
  }
}

export type ViolationTreeNode<V extends Violation = Violation> = TreeNode<V>

export const collection = <V extends Violation>(violations: readonly V[]): ViolationCollection<V> => (
  new ViolationCollection(violations)
)
