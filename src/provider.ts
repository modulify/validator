import type {
  Constraint,
  ConstraintValidator,
  Provider,
} from '../types'

import Length from '@/constraints/Length'
import LengthValidator from '@/validators/LengthValidator'

import OneOf from '@/constraints/OneOf'
import OneOfValidator from '@/validators/OneOfValidator'

export default class ProviderChain implements Provider {
  private _current: Provider | null
  private _previous: Provider | null

  constructor (
    current: Provider | null = null,
    previous: Provider | null = null
  ) {
    this._current = current
    this._previous = previous
  }

  get (constraint: Constraint): ConstraintValidator | null {
    switch (true) {
      case constraint instanceof Length:
        return new LengthValidator(constraint)
      case constraint instanceof OneOf:
        return new OneOfValidator(constraint)
      default:
        return this._current?.get(constraint)
          ?? this._previous?.get(constraint)
          ?? null
    }
  }

  override (provider: Provider): Provider {
    return new ProviderChain(provider, this)
  }
}