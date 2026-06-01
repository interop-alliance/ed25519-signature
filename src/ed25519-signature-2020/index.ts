import { DataIntegrityProof } from '@interop/data-integrity-proof'
import type { ISigner, IProofDescription } from '@interop/data-integrity-core'
import { ed25519Sig2020Cryptosuite } from './cryptosuite.js'
import { ensureSignerAlgorithm } from '../core/createSigner.js'
import suiteContext2020 from 'ed25519-signature-2020-context'

const SUITE_CONTEXT_URL = suiteContext2020.constants.CONTEXT_URL

export class Ed25519Signature2020 extends DataIntegrityProof {
  static CONTEXT_URL = SUITE_CONTEXT_URL
  static CONTEXT = suiteContext2020.contexts.get(SUITE_CONTEXT_URL)

  constructor({
    signer,
    date
  }: {
    signer?: ISigner
    date?: string | Date | number | null
  } = {}) {
    // Cryptosuite has no `name`, so this.cryptosuite stays undefined --
    // matching the absent cryptosuite field on legacy 2020 proofs.
    // DataIntegrityProof validates signer.algorithm; ensure it is set for
    // ISigner sources that leave `algorithm` unset.
    const wrappedSigner: ISigner | undefined = signer
      ? ensureSignerAlgorithm(signer)
      : undefined
    super({ signer: wrappedSigner, date, cryptosuite: ed25519Sig2020Cryptosuite })
    this.type = 'Ed25519Signature2020'
    this.contextUrl = SUITE_CONTEXT_URL
  }

  // Called by DataIntegrityProof.createProof() before hashing proof options.
  // Removes the cryptosuite field that the base class writes (2020 proofs
  // carry no cryptosuite field).
  override async updateProof({
    proof
  }: {
    proof: IProofDescription
    [key: string]: unknown
  }): Promise<IProofDescription> {
    delete proof.cryptosuite
    return proof
  }
}

export { suiteContext2020 as suiteContext }
