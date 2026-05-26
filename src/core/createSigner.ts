import type { SignerLike } from '@digitalbazaar/data-integrity'
import { requiredAlgorithm } from './requiredAlgorithm.js'

type SignerSource = Omit<SignerLike, 'algorithm'> & { algorithm?: string }

/**
 * Produces a signer that carries `algorithm`, which `DataIntegrityProof`
 * requires (it asserts `signer.algorithm === requiredAlgorithm` at
 * construction). `@interop/ed25519-verification-key`'s `signer()` does not set
 * `algorithm`; this injects it. Idempotent: an `algorithm` already present
 * (e.g. once the key library sets it) is preserved.
 */
export function createSigner(keyPair: { signer(): SignerSource }): SignerLike {
  return ensureSignerAlgorithm(keyPair.signer())
}

export function ensureSignerAlgorithm(signer: SignerSource): SignerLike {
  return { ...signer, algorithm: signer.algorithm ?? requiredAlgorithm }
}
