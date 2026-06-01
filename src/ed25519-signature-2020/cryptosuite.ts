import { canonize } from '../eddsa-rdfc-2022/canonize.js'
import { createVerifier } from '../core/createVerifier.js'
import { requiredAlgorithm } from '../core/requiredAlgorithm.js'
import type { Cryptosuite } from '@interop/data-integrity-proof'

// Internal cryptosuite for Ed25519Signature2020 -- deliberately no `name`
// so this.cryptosuite stays undefined on the proof (2020 proofs carry no
// cryptosuite field). `Cryptosuite.name` is optional, so no cast is needed.
export const ed25519Sig2020Cryptosuite: Cryptosuite = {
  canonize,
  createVerifier,
  requiredAlgorithm
}
