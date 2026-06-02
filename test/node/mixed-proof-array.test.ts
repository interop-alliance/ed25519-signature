import { describe, it, expect, beforeAll } from 'vitest'
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { Ed25519Signature2020 } from '../../src/ed25519-signature-2020/index.js'
import { eddsaRdfc2022 } from '../../src/eddsa-rdfc-2022/index.js'
import {
  createSignCryptosuite,
  createVerifyCryptosuite
} from '../../src/eddsa-jcs-2022/index.js'
import { createSigner } from '../../src/core/createSigner.js'
import { credential, mockKeyPair2020 } from './mock-data.js'
import { documentLoader } from './documentLoader.js'

const {
  purposes: { AssertionProofPurpose }
} = jsigs as any

const DI_CONTEXT_URL = 'https://w3id.org/security/data-integrity/v2'

// A credential whose @context carries both the ed25519-2020 suite context
// (needed by Ed25519Signature2020) and the data-integrity context (needed by
// the eddsa-* suites), so one document can hold all three proof types.
const mixedCredential = {
  ...credential,
  '@context': [...credential['@context'], DI_CONTEXT_URL]
}

describe('mixed proof array (one VC, three proof types)', () => {
  let signed: any

  beforeAll(async () => {
    const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)

    // 1) Ed25519Signature2020 (legacy proof, no cryptosuite field)
    signed = await jsigs.sign(
      { ...mixedCredential },
      {
        suite: new Ed25519Signature2020({ signer: keyPair.signer() }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      }
    )

    // 2) eddsa-rdfc-2022 (DataIntegrityProof, RDFC-1.0) -- appends to proof set
    signed = await jsigs.sign(signed, {
      suite: new DataIntegrityProof({
        cryptosuite: eddsaRdfc2022,
        signer: createSigner(keyPair)
      }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })

    // 3) eddsa-jcs-2022 (DataIntegrityProof, JCS) -- appends to proof set
    signed = await jsigs.sign(signed, {
      suite: new DataIntegrityProof({
        cryptosuite: createSignCryptosuite(),
        signer: createSigner(keyPair)
      }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })
  })

  it('accumulates all three proofs into a proof set', () => {
    expect(Array.isArray(signed.proof)).toBe(true)
    expect(signed.proof).toHaveLength(3)

    const sig2020 = signed.proof.find(
      (proof: any) => proof.type === 'Ed25519Signature2020'
    )
    const rdfc = signed.proof.find(
      (proof: any) => proof.cryptosuite === 'eddsa-rdfc-2022'
    )
    const jcs = signed.proof.find(
      (proof: any) => proof.cryptosuite === 'eddsa-jcs-2022'
    )

    expect(sig2020).toBeTruthy()
    expect(sig2020.cryptosuite).toBeUndefined()
    expect(rdfc.type).toBe('DataIntegrityProof')
    expect(jcs.type).toBe('DataIntegrityProof')
  })

  it('verifies all three proofs in a single jsigs.verify call', async () => {
    const result = await jsigs.verify(signed, {
      suite: [
        new Ed25519Signature2020(),
        new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 }),
        new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() })
      ],
      purpose: new AssertionProofPurpose(),
      documentLoader
    })

    expect(result.verified).toBe(true)
    expect(result.results).toHaveLength(3)
    for (const oneResult of result.results) {
      expect(oneResult.verified).toBe(true)
    }
  })

  // jsigs proof-set verify returns verified=true if *any* matched proof
  // verifies (ProofSet.js: `results.some(r => r.verified)`). So tampering one
  // proof does not flip the overall result -- it flips that proof's own
  // per-proof result. Assert at that granularity.
  it('reports a tampered proof as failed in its per-proof result', async () => {
    const tampered = JSON.parse(JSON.stringify(signed))
    const rdfcProof = tampered.proof.find(
      (proof: any) => proof.cryptosuite === 'eddsa-rdfc-2022'
    )
    // Flip the trailing characters of the rdfc proofValue
    const value = rdfcProof.proofValue
    rdfcProof.proofValue =
      value.slice(0, -2) + (value.slice(-2) === 'aa' ? 'bb' : 'aa')

    const result = await jsigs.verify(tampered, {
      suite: [
        new Ed25519Signature2020(),
        new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 }),
        new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() })
      ],
      purpose: new AssertionProofPurpose(),
      documentLoader
    })

    const rdfcResult = result.results.find(
      (oneResult: any) => oneResult.proof?.cryptosuite === 'eddsa-rdfc-2022'
    )
    expect(rdfcResult).toBeTruthy()
    expect(rdfcResult!.verified).toBe(false)

    // The other two proofs are untouched and still verify
    const others = result.results.filter(
      (oneResult: any) => oneResult.proof?.cryptosuite !== 'eddsa-rdfc-2022'
    )
    expect(others).toHaveLength(2)
    for (const oneResult of others) {
      expect(oneResult.verified).toBe(true)
    }
  })
})
