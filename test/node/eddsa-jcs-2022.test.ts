import { describe, it, expect } from 'vitest'
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import {
  createSignCryptosuite,
  createVerifyCryptosuite
} from '../../src/eddsa-jcs-2022/index.js'
import { createSigner } from '../../src/core/createSigner.js'
import { credential, mockKeyPair2020 } from './mock-data.js'
import { documentLoader } from './documentLoader.js'

const { purposes: { AssertionProofPurpose } } = jsigs as any

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

describe('eddsa-jcs-2022 cryptosuite', () => {
  it('createSignCryptosuite returns name="eddsa-jcs-2022"', () => {
    const cs = createSignCryptosuite()
    expect(cs.name).toBe('eddsa-jcs-2022')
    expect(typeof cs.createVerifyData).toBe('function')
    expect(typeof cs.canonize).toBe('function')
  })

  it('createVerifyCryptosuite returns name="eddsa-jcs-2022"', () => {
    const cs = createVerifyCryptosuite()
    expect(cs.name).toBe('eddsa-jcs-2022')
    expect(typeof cs.createVerifier).toBe('function')
  })

  it('sign cryptosuite throws if createVerifier is called', () => {
    const cs = createSignCryptosuite()
    expect(() => (cs as any).createVerifier()).toThrow()
  })

  it('signs and verifies a credential round-trip', async () => {
    const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
    const signer = createSigner(keyPair)

    const signSuite = new DataIntegrityProof({
      cryptosuite: createSignCryptosuite(),
      signer
    })

    const signed: any = await jsigs.sign({ ...jcsCredential }, {
      suite: signSuite,
      purpose: new AssertionProofPurpose(),
      documentLoader
    })

    expect(signed.proof.type).toBe('DataIntegrityProof')
    expect(signed.proof.cryptosuite).toBe('eddsa-jcs-2022')

    const result = await jsigs.verify(signed, {
      suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    })
    expect(result.verified).toBe(true)
  })

  describe('context-prefix ordering check (security-sensitive)', () => {
    it('rejects when document @context does not start with proof @context', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = createSigner(keyPair)

      const signed = await jsigs.sign({ ...jcsCredential }, {
        suite: new DataIntegrityProof({
          cryptosuite: createSignCryptosuite(),
          signer
        }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      // Tamper: reorder document @context so it no longer starts with proof @context
      const tampered = JSON.parse(JSON.stringify(signed))
      const docCtx = tampered['@context'] as string[]
      ;[docCtx[0], docCtx[1]] = [docCtx[1]!, docCtx[0]!]

      const result = await jsigs.verify(tampered, {
        suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
      expect(result.verified).toBe(false)
    })

    // Regression: an inline @context object must still match after the VC is
    // serialized and re-parsed (the realistic transport path). A reference
    // (`!==`) compare would wrongly reject this; the check compares by value.
    it('accepts a serialized VC carrying an inline @context object', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = createSigner(keyPair)

      // jcsCredential['@context'] includes the inline {AlumniCredential, ...}
      // object at index 1.
      expect(typeof jcsCredential['@context'][1]).toBe('object')

      const signed = await jsigs.sign({ ...jcsCredential }, {
        suite: new DataIntegrityProof({
          cryptosuite: createSignCryptosuite(),
          signer
        }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      // Round-trip through JSON, as a verifier receiving the VC would.
      const roundTripped = JSON.parse(JSON.stringify(signed))

      const result = await jsigs.verify(roundTripped, {
        suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
      expect(result.verified).toBe(true)
    })

    it('accepts when document @context starts with proof @context', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = createSigner(keyPair)

      const signed = await jsigs.sign({ ...jcsCredential }, {
        suite: new DataIntegrityProof({
          cryptosuite: createSignCryptosuite(),
          signer
        }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      const result = await jsigs.verify(signed, {
        suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
      expect(result.verified).toBe(true)
    })
  })
})
