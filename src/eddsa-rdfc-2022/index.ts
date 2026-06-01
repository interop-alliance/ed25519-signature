import { canonize } from './canonize.js'
import { createVerifier } from '../core/createVerifier.js'
import { requiredAlgorithm } from '../core/requiredAlgorithm.js'
import type { Cryptosuite } from '@interop/data-integrity-proof'

export const eddsaRdfc2022: Cryptosuite = {
  canonize,
  createVerifier,
  name: 'eddsa-rdfc-2022',
  requiredAlgorithm
}
