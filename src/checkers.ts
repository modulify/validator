export const isEqual = (value: number, exact: number) => value === exact
export const isGte = (value: number, min: number) => value >= min
export const isLte = (value: number, max: number) => value <= max

export const inRange = (value: number, [min, max]: [number, number]) => value >= min && value <= max
export const startsWith = (value: string, prefix: string) => value.startsWith(prefix)
export const endsWith = (value: string, suffix: string) => value.endsWith(suffix)
export const matchesPattern = (value: string, pattern: RegExp) => new RegExp(pattern.source, pattern.flags).test(value)
export const isMultipleOf = (value: number, step: number) => {
  if (step === 0) {
    return false
  }

  const quotient = value / step
  const nearestInteger = Math.round(quotient)
  const delta = Math.abs(quotient - nearestInteger)

  return Number.isFinite(quotient) && delta <= Number.EPSILON * Math.max(1, Math.abs(quotient)) * 16
}
