import { sha256 } from '../core/sha256.js'
import type { IProofDescription } from '@interop/data-integrity-core'

const NAME = 'eddsa-jcs-2022'

function concat(b1: Uint8Array, b2: Uint8Array): Uint8Array {
  const out = new Uint8Array(b1.length + b2.length)
  out.set(b1, 0)
  out.set(b2, b1.length)
  return out
}

async function canonizeProof(
  proofOptions: IProofDescription,
  canonize: (input: unknown) => Promise<string>
): Promise<string> {
  const proof = { ...proofOptions }
  delete proof.proofValue
  return canonize(proof)
}

// On sign: copy document.@context onto proof so verifiers can reconstruct it.
function modifyForSign({
  proof,
  document
}: {
  proof: IProofDescription
  document: Record<string, unknown>
}): void {
  if (document['@context']) {
    proof['@context'] = document['@context'] as IProofDescription['@context']
  }
}

// On verify: assert document.@context starts with proof.@context in order.
// This ordering check is security-sensitive per the JCS spec.
//
// Entries are compared by VALUE, not reference: an inline @context object (e.g.
// {AlumniCredential: ...}) becomes a distinct instance once the VC is
// serialized and re-parsed, so a reference (`!==`) compare wrongly rejects every
// transmitted VC that carries one. JSON.stringify gives the value compare the
// spec asks for; it is key-order sensitive, but both @context trees originate
// from the same issuer-side object so order is preserved (and any mismatch just
// throws -- fail-closed).
function modifyForVerify({
  proof,
  document
}: {
  proof: IProofDescription
  document: Record<string, unknown>
}): void {
  if (!proof['@context']) {
    return
  }
  const proofContext = Array.isArray(proof['@context'])
    ? proof['@context']
    : [proof['@context']]
  const docContext = Array.isArray(document['@context'])
    ? document['@context']
    : [document['@context']]

  for (let i = 0; i < proofContext.length; i++) {
    if (JSON.stringify(proofContext[i]) !== JSON.stringify(docContext[i])) {
      throw new Error(
        'document.@context does not start with proof.@context'
      )
    }
  }
  // Adopt proof @context for canonicalization
  document['@context'] = proof['@context']
}

export type CreateVerifyDataFn = (opts: unknown) => Promise<Uint8Array>

export function createVerifyDataFn(mode: 'sign' | 'verify'): CreateVerifyDataFn {
  return async function (opts: unknown) {
    const { cryptosuite, document, proof } = opts as {
      cryptosuite: { name: string; canonize(input: unknown): Promise<string> }
      document: Record<string, unknown>
      proof: IProofDescription
    }
    if (cryptosuite?.name !== NAME) {
      throw new TypeError(`"cryptosuite.name" must be "${NAME}".`)
    }

    if (mode === 'sign') {
      modifyForSign({ proof, document })
    } else {
      modifyForVerify({ proof, document })
    }

    const [proofHash, docHash] = await Promise.all([
      canonizeProof(proof, cryptosuite.canonize.bind(cryptosuite)).then(jcs =>
        sha256({ string: jcs })
      ),
      cryptosuite.canonize(document).then(jcs => sha256({ string: jcs }))
    ])

    return concat(proofHash, docHash)
  }
}
