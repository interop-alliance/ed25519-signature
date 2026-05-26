import { sha256 } from '../core/sha256.js'
import type { ProofLike } from '@digitalbazaar/data-integrity'

const NAME = 'eddsa-jcs-2022'

function concat(b1: Uint8Array, b2: Uint8Array): Uint8Array {
  const out = new Uint8Array(b1.length + b2.length)
  out.set(b1, 0)
  out.set(b2, b1.length)
  return out
}

async function canonizeProof(
  proofOptions: ProofLike,
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
  proof: ProofLike
  document: Record<string, unknown>
}): void {
  if (document['@context']) {
    proof['@context'] = document['@context']
  }
}

// On verify: assert document.@context starts with proof.@context in order.
// This ordering check is security-sensitive per the JCS spec.
function modifyForVerify({
  proof,
  document
}: {
  proof: ProofLike
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
    if (proofContext[i] !== docContext[i]) {
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
      proof: ProofLike
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
