import { describe, it, expect } from 'vitest'
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { eddsaRdfc2022 } from '../../src/eddsa-rdfc-2022/index.js'
import { createSigner } from '../../src/core/createSigner.js'
import { credential, mockKeyPair2020 } from './mock-data.js'
import { documentLoader } from './documentLoader.js'

const {
  purposes: { AssertionProofPurpose }
} = jsigs as any

// eddsa-rdfc-2022 uses DataIntegrityProof context
const DI_CONTEXT_URL = 'https://w3id.org/security/data-integrity/v2'

describe('eddsa-rdfc-2022 cryptosuite', () => {
  it('is a well-formed cryptosuite object', () => {
    expect(eddsaRdfc2022.name).toBe('eddsa-rdfc-2022')
    expect(typeof eddsaRdfc2022.canonize).toBe('function')
    expect(typeof eddsaRdfc2022.createVerifier).toBe('function')
    expect(eddsaRdfc2022.requiredAlgorithm).toBe('Ed25519')
  })

  it('signs and verifies a credential round-trip', async () => {
    const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
    const signer = createSigner(keyPair)

    const rdfc2022Credential = {
      ...credential,
      '@context': [
        ...credential['@context'].filter(
          (c: unknown) => typeof c !== 'string' || !c.includes('ed25519-2020')
        ),
        DI_CONTEXT_URL
      ]
    }

    const suite = new DataIntegrityProof({ cryptosuite: eddsaRdfc2022, signer })

    const signed: any = await jsigs.sign(
      { ...rdfc2022Credential },
      {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      }
    )

    expect(signed.proof.type).toBe('DataIntegrityProof')
    expect(signed.proof.cryptosuite).toBe('eddsa-rdfc-2022')

    const result = await jsigs.verify(signed, {
      suite: new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })
    expect(result.verified).toBe(true)
  })
})
