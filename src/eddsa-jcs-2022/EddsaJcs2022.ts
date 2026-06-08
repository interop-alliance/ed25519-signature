/*!
 * Copyright (c) 2026 Interop Alliance. All rights reserved.
 */
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import type { ISigner } from '@interop/data-integrity-core'
import { ensureSignerAlgorithm } from '../core/createSigner.js'
import { createSignCryptosuite } from './index.js'

/**
 * A ready-to-instantiate signing suite for the `eddsa-jcs-2022` cryptosuite.
 *
 * The `eddsa-jcs-2022` cryptosuite itself ships as factory functions
 * (`createSignCryptosuite()` / `createVerifyCryptosuite()`) that are fed into
 * `new DataIntegrityProof({ cryptosuite, signer })`. This thin subclass bakes
 * the sign cryptosuite in, exposing the same `new SuiteClass({ signer, date })`
 * constructor contract as `Ed25519Signature2020`. That lets consumers which
 * instantiate a suite by class (e.g. `@interop/ezcap`'s `ZcapClient`) select
 * `eddsa-jcs-2022` by passing this class.
 *
 * Use {@link createVerifyCryptosuite} for the verification side.
 *
 * No static `CONTEXT` / `CONTEXT_URL` are exposed: JCS canonicalization is pure
 * JSON (no JSON-LD expansion), so signing does not require the data-integrity
 * context to be served by a document loader. The base class still sets
 * `this.contextUrl` to the data-integrity context and appends it to the signed
 * document for downstream verifiers.
 */
export class EddsaJcs2022 extends DataIntegrityProof {
  constructor({
    signer,
    date
  }: {
    signer?: ISigner
    date?: string | Date | number | null
  } = {}) {
    // DataIntegrityProof validates signer.algorithm; ensure it is set for
    // ISigner sources that leave `algorithm` unset.
    const wrappedSigner: ISigner | undefined = signer
      ? ensureSignerAlgorithm(signer)
      : undefined
    super({
      signer: wrappedSigner,
      date,
      cryptosuite: createSignCryptosuite()
    })
  }
}
