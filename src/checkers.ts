export const isEqual = (value: number, exact: number) => value === exact
export const isGte = (value: number, min: number) => value >= min
export const isLte = (value: number, max: number) => value <= max

export const inRange = (value: number, [min, max]: [number, number]) => value >= min && value <= max
