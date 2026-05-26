import { describe, it, expect, beforeAll } from 'vitest'
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { Ed25519Signature2020 } from '../../src/ed25519-signature-2020/index.js'
import { specKeyMaterial, specPublicKey, specSignedFixture } from './mock-data.js'
import { documentLoader } from './documentLoader.js'

const { purposes: { AssertionProofPurpose } } = jsigs as any

describe('vc-di-eddsa spec test vectors (Ed25519Signature2020)', () => {
  let keyPair: Awaited<ReturnType<typeof Ed25519VerificationKey.from>>

  beforeAll(async () => {
    keyPair = await Ed25519VerificationKey.from({
      ...specKeyMaterial,
      type: 'Multikey'
    } as any)
    keyPair.controller = specPublicKey.controller
    keyPair.id = specPublicKey.id
  })

  it('creates a proof matching the spec fixture', async () => {
    const unsigned = { ...specSignedFixture }
    delete (unsigned as any).proof

    const signer = keyPair.signer()
    const date = new Date(specSignedFixture.proof.created)

    const signed = await jsigs.sign(unsigned, {
      suite: new Ed25519Signature2020({ signer, date }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })

    expect(signed).toEqual(specSignedFixture)
  })

  it('verifies the spec signed fixture', async () => {
    const result = await jsigs.verify(specSignedFixture, {
      suite: new Ed25519Signature2020(),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })
    expect(result.verified).toBe(true)
  })
})
