import { describe, it, expect, beforeAll } from 'vitest'
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { Ed25519Signature2020, suiteContext } from '../../src/ed25519-signature-2020/index.js'
import { credential, mockKeyPair2020 } from './mock-data.js'
import { documentLoader } from './documentLoader.js'

const { purposes: { AssertionProofPurpose } } = jsigs as any

describe('Ed25519Signature2020', () => {
  describe('exports', () => {
    it('has proper static exports', () => {
      expect(Ed25519Signature2020).toBeTruthy()
      expect(Ed25519Signature2020.CONTEXT_URL).toBeTruthy()
      expect(Ed25519Signature2020.CONTEXT_URL).toBe(suiteContext.constants.CONTEXT_URL)
      expect(Ed25519Signature2020.CONTEXT).toBeTruthy()
      expect(suiteContext).toBeTruthy()
      expect(suiteContext.constants).toBeTruthy()
      expect(suiteContext.contexts).toBeTruthy()
    })
  })

  describe('sign() and verify()', () => {
    it('signs a document with a key pair', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = keyPair.signer()
      const suite = new Ed25519Signature2020({ signer, date: '2010-01-01T19:23:24Z' })

      const signedCredential: any = await jsigs.sign({ ...credential }, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      expect(signedCredential).toHaveProperty('proof')
      expect(signedCredential.proof.type).toBe('Ed25519Signature2020')
      expect(signedCredential.proof.cryptosuite).toBeUndefined()
      expect(typeof signedCredential.proof.proofValue).toBe('string')
      expect(signedCredential.proof.proofValue[0]).toBe('z')
    })

    it('produces a byte-identical proofValue to the spec test vector', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = keyPair.signer()
      const suite = new Ed25519Signature2020({ signer, date: '2010-01-01T19:23:24Z' })

      const signedCredential: any = await jsigs.sign({ ...credential }, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      expect(signedCredential.proof.proofValue).toBe(
        'z3MvGcVxzRzzpKF1HA11EjvfPZsN8NAb7kXBRfeTm3CBg2gcJLQM5hZNmj6Ccd9Lk4C1YueiFZvkSx4FuHVYVouQk'
      )
    })

    it('signs with a signer object (KMS-style)', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = keyPair.signer()
      const suite = new Ed25519Signature2020({ signer, date: '2010-01-01T19:23:24Z' })

      const signedCredential: any = await jsigs.sign({ ...credential }, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      expect(signedCredential.proof.proofValue).toBe(
        'z3MvGcVxzRzzpKF1HA11EjvfPZsN8NAb7kXBRfeTm3CBg2gcJLQM5hZNmj6Ccd9Lk4C1YueiFZvkSx4FuHVYVouQk'
      )
    })

    it('throws if no signer is specified', async () => {
      const suite = new Ed25519Signature2020()
      let error: Error | undefined
      try {
        await jsigs.sign({ ...credential }, {
          suite,
          purpose: new AssertionProofPurpose(),
          documentLoader
        })
      } catch (e) {
        error = e as Error
      }
      expect(error).toBeDefined()
    })

    it('adds the suite context when missing', async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = keyPair.signer()
      const suite = new Ed25519Signature2020({ signer })

      const unsigned = {
        ...credential,
        // suite context deliberately omitted (overrides credential's @context)
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          { AlumniCredential: 'https://schema.org#AlumniCredential', alumniOf: 'https://schema.org#alumniOf' }
        ],
        id: credential.id + '-ctx-test'
      }

      const signed: any = await jsigs.sign(unsigned, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })

      expect(signed['@context']).toContain('https://w3id.org/security/suites/ed25519-2020/v1')
    })
  })

  describe('verify()', () => {
    let signedCredential: any

    beforeAll(async () => {
      const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
      const signer = keyPair.signer()
      const suite = new Ed25519Signature2020({ signer, date: '2010-01-01T19:23:24Z' })
      signedCredential = await jsigs.sign({ ...credential }, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
    })

    it('verifies a signed document', async () => {
      const suite = new Ed25519Signature2020()
      const result = await jsigs.verify(signedCredential, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
      expect(result.verified).toBe(true)
    })

    it('fails verification if proofValue is not a string', async () => {
      const suite = new Ed25519Signature2020()
      const copy = JSON.parse(JSON.stringify(signedCredential))
      copy.proof.proofValue = {}
      const result = await jsigs.verify(copy, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
      expect(result.verified).toBe(false)
    })

    it('fails verification for wrong proof type', async () => {
      const suite = new Ed25519Signature2020()
      const copy = JSON.parse(JSON.stringify(signedCredential))
      copy.proof.type = 'Ed25519Signature2018'
      const result = await jsigs.verify(copy, {
        suite,
        purpose: new AssertionProofPurpose(),
        documentLoader
      })
      expect(result.verified).toBe(false)
    })
  })
})
