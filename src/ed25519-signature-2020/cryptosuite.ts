import { canonize } from '../eddsa-rdfc-2022/canonize.js'
import { createVerifier } from '../core/createVerifier.js'
import { requiredAlgorithm } from '../core/requiredAlgorithm.js'
import type { CryptosuiteLike } from '@digitalbazaar/data-integrity'

// Internal cryptosuite for Ed25519Signature2020 -- deliberately no `name`
// so this.cryptosuite stays undefined on the proof (2020 proofs carry no
// cryptosuite field).
export const ed25519Sig2020Cryptosuite: CryptosuiteLike = {
  canonize: canonize as CryptosuiteLike['canonize'],
  createVerifier: createVerifier as CryptosuiteLike['createVerifier'],
  requiredAlgorithm
}
