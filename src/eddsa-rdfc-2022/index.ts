import { canonize } from './canonize.js'
import { createVerifier } from '../core/createVerifier.js'
import { requiredAlgorithm } from '../core/requiredAlgorithm.js'

export const eddsaRdfc2022 = {
  canonize,
  createVerifier,
  name: 'eddsa-rdfc-2022',
  requiredAlgorithm
}
