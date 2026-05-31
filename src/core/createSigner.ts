import type { ISigner } from '@digitalcredentials/ssi'
import { requiredAlgorithm } from './requiredAlgorithm.js'

/**
 * Produces a signer that carries `algorithm`, which `DataIntegrityProof`
 * requires (it asserts `signer.algorithm === requiredAlgorithm` at
 * construction). `@interop/ed25519-verification-key` >= 6.2.0 already sets
 * `algorithm` on the returned signer, so this is a no-op in the normal case.
 * Kept as a safety net for `ISigner` sources whose `algorithm` is optional:
 * idempotent -- an `algorithm` already present is preserved.
 */
export function createSigner(keyPair: { signer(): ISigner }): ISigner {
  return ensureSignerAlgorithm(keyPair.signer())
}

export function ensureSignerAlgorithm(signer: ISigner): ISigner {
  return { ...signer, algorithm: signer.algorithm ?? requiredAlgorithm }
}
