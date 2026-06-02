// Browser harness: imported via the Vite dev server inside page.evaluate.
// Vite resolves the bare deps and (via vite.config.ts alias) remaps the JCS
// suite's sha256.js to sha256-browser.ts, so a JCS round-trip exercises the
// crypto.subtle path. Reuses the node mock-data and document loader.
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
import { credential, mockKeyPair2020 } from '../node/mock-data.js'
import { documentLoader } from '../node/documentLoader.js'

const {
  purposes: { AssertionProofPurpose }
} = jsigs as any

const DI_CONTEXT_URL = 'https://w3id.org/security/data-integrity/v2'

const diCredential = {
  ...credential,
  '@context': [
    ...credential['@context'].filter(
      (entry: unknown) =>
        typeof entry !== 'string' || !entry.includes('ed25519-2020')
    ),
    DI_CONTEXT_URL
  ]
}

export async function roundTrip2020(): Promise<boolean> {
  const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
  const signed = await jsigs.sign(
    { ...credential },
    {
      suite: new Ed25519Signature2020({ signer: keyPair.signer() }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    }
  )
  const result = await jsigs.verify(signed, {
    suite: new Ed25519Signature2020(),
    purpose: new AssertionProofPurpose(),
    documentLoader
  })
  return result.verified
}

export async function roundTripRdfc(): Promise<boolean> {
  const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
  const signed = await jsigs.sign(
    { ...diCredential },
    {
      suite: new DataIntegrityProof({
        cryptosuite: eddsaRdfc2022,
        signer: createSigner(keyPair)
      }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    }
  )
  const result = await jsigs.verify(signed, {
    suite: new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 }),
    purpose: new AssertionProofPurpose(),
    documentLoader
  })
  return result.verified
}

export async function roundTripJcs(): Promise<boolean> {
  const keyPair = await Ed25519VerificationKey.from(mockKeyPair2020)
  const signed = await jsigs.sign(
    { ...diCredential },
    {
      suite: new DataIntegrityProof({
        cryptosuite: createSignCryptosuite(),
        signer: createSigner(keyPair)
      }),
      purpose: new AssertionProofPurpose(),
      documentLoader
    }
  )
  const result = await jsigs.verify(signed, {
    suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
    purpose: new AssertionProofPurpose(),
    documentLoader
  })
  return result.verified
}
