import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { requiredAlgorithm } from './requiredAlgorithm.js'

export async function createVerifier({
  verificationMethod
}: {
  verificationMethod: unknown
}): Promise<{ verify(opts: { data: Uint8Array; signature: Uint8Array }): Promise<boolean>; algorithm: string }> {
  // verificationMethod is one of: Multikey, Ed25519VerificationKey2020,
  // Ed25519VerificationKey2018, or JsonWebKey2020
  const key = await Ed25519VerificationKey.from(verificationMethod as any)
  const verifier = key.verifier()
  // DataIntegrityProof checks verifier.algorithm against requiredAlgorithm;
  // the verification-key library does not set algorithm on the returned object.
  // Idempotent: preserve an algorithm already set (e.g. once the key library
  // sets it).
  return { ...verifier, algorithm: verifier.algorithm ?? requiredAlgorithm }
}
