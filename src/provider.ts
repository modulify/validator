import type {
  Constraint,
  Validator,
} from '../types'

import Length from '@/constraints/Length'
import LengthValidator from '@/validators/LengthValidator'

import OneOf from '@/constraints/OneOf'
import OneOfValidator from '@/validators/OneOfValidator'

export default {
  get (constraint: Constraint): Validator {
    switch (true) {
      case constraint instanceof Length:
        return new LengthValidator(constraint)
      case constraint instanceof OneOf:
        return new OneOfValidator(constraint)
    }
  },
}