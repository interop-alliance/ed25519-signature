import { describe, it, expect } from 'vitest'
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { EddsaJcs2022 } from '../../src/eddsa-jcs-2022/EddsaJcs2022.js'
import { createVerifyCryptosuite } from '../../src/eddsa-jcs-2022/index.js'
import { credential, mockKeyPair2020 } from './mock-data.js'
import { documentLoader } from './documentLoader.js'

const {
  purposes: { AssertionProofPurpose }
} = jsigs as any

const DI_CONTEXT_URL = 'https://w3id.org/security/data-integrity/v2'

const jcsCredential = {
  ...credential,
  '@context': [
    ...credential['@context'].filter(
      (c: unknown) => typeof c !== 'string' || !c.includes('ed25519-2020')
    ),
    DI_CONTEXT_URL
  ]
}

describe('EddsaJcs2022 suite class', () => {
  it('signs via `new EddsaJcs2022({ signer })` (eddsa-jcs-2022 proof)', async () => {
    const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
    const signer = keyPair.signer()

    const signed: any = await jsigs.sign(
      { ...jcsCredential },
      {
        suite: new EddsaJcs2022({ signer }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      }
    )

    expect(signed.proof.type).toBe('DataIntegrityProof')
    expect(signed.proof.cryptosuite).toBe('eddsa-jcs-2022')

    const result = await jsigs.verify(signed, {
      suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })
    expect(result.verified).toBe(true)
  })

  it('honors the supplied `date` as proof.created', async () => {
    const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
    const signer = keyPair.signer()
    const date = '2020-01-01T19:23:24Z'

    const signed: any = await jsigs.sign(
      { ...jcsCredential },
      {
        suite: new EddsaJcs2022({ signer, date }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      }
    )

    expect(signed.proof.created).toBe(date)
  })
})
