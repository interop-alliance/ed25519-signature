import type { IVerifier, IVerificationMethod } from '@interop/data-integrity-core'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { requiredAlgorithm } from './requiredAlgorithm.js'

export async function createVerifier({
  verificationMethod
}: {
  verificationMethod: IVerificationMethod
}): Promise<IVerifier> {
  // verificationMethod is one of: Multikey, Ed25519VerificationKey2020,
  // Ed25519VerificationKey2018, or JsonWebKey2020
  const key = await Ed25519VerificationKey.from(verificationMethod as any)
  const verifier = key.verifier()
  // DataIntegrityProof checks verifier.algorithm against requiredAlgorithm.
  // `@interop/ed25519-verification-key` >= 6.2.0 already sets `algorithm`, so
  // this is a no-op in the normal case; kept as an idempotent safety net for
  // IVerifier sources whose `algorithm` is optional.
  return { ...verifier, algorithm: verifier.algorithm ?? requiredAlgorithm }
}
