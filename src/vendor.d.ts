// Type declarations for untyped runtime dependencies.

declare module '@digitalbazaar/data-integrity' {
  export interface CryptosuiteLike {
    name?: string
    canonize?: (input: unknown, options?: unknown) => Promise<string>
    createVerifier: (options: {
      verificationMethod: unknown
    }) => Promise<VerifierLike>
    requiredAlgorithm?: string | string[]
    createVerifyData?: (options: unknown) => Promise<Uint8Array>
    createProofValue?: (options: unknown) => Promise<string>
    derive?: (options: unknown) => Promise<unknown>
  }

  export interface SignerLike {
    sign(options: { data: Uint8Array }): Promise<Uint8Array>
    id: string
    algorithm: string
  }

  export interface VerifierLike {
    verify(options: { data: Uint8Array; signature: Uint8Array }): Promise<boolean>
    algorithm: string
    id?: string
  }

  export interface ProofLike {
    type?: string
    cryptosuite?: string
    proofValue?: string
    created?: string
    verificationMethod?: string | { id: string }
    proofPurpose?: string
    [key: string]: unknown
  }

  export class DataIntegrityProof {
    type: string
    cryptosuite: string | undefined
    contextUrl: string
    signer: SignerLike | undefined
    verificationMethod: string | undefined
    canonize: (input: unknown, options?: unknown) => Promise<string>
    createVerifier: (options: {
      verificationMethod: unknown
    }) => Promise<VerifierLike>
    requiredAlgorithm: string | string[]
    date: Date | null | undefined
    _cryptosuite: CryptosuiteLike
    _hashCache?: { document: unknown; hash: Promise<Uint8Array> }

    constructor(options?: {
      signer?: SignerLike
      date?: string | Date | number | null
      cryptosuite: CryptosuiteLike
      legacyContext?: boolean
    })

    sign(options: {
      verifyData: Uint8Array
      proof: ProofLike
    }): Promise<ProofLike>

    verifySignature(options: {
      verifyData: Uint8Array
      verificationMethod: unknown
      proof: ProofLike
    }): Promise<boolean>

    createProof(options: {
      document: unknown
      purpose: unknown
      proofSet?: unknown[]
      documentLoader: (url: string) => Promise<unknown>
    }): Promise<ProofLike>

    updateProof(options: {
      proof: ProofLike
      [key: string]: unknown
    }): Promise<ProofLike>

    verifyProof(options: {
      proof: object
      proofSet?: unknown[]
      document: unknown
      purpose?: unknown
      documentLoader: (url: string) => Promise<unknown>
    }): Promise<{ verified: boolean; error?: Error; verificationMethod?: unknown }>

    // Required by jsigs `LinkedDataProof`; delegates to the cryptosuite's
    // `derive` (throws if absent). Declared so a DataIntegrityProof is
    // structurally assignable where jsigs expects a suite.
    derive(options: {
      document: unknown
      purpose: unknown
      proofSet?: unknown[]
      documentLoader: (url: string) => Promise<unknown>
    }): Promise<object>

    createVerifyData(options: {
      document: unknown
      proof: ProofLike
      documentLoader: (url: string) => Promise<unknown>
    }): Promise<Uint8Array>

    getVerificationMethod(options: {
      proof: ProofLike
      documentLoader: (url: string) => Promise<unknown>
    }): Promise<unknown>

    canonizeProof(
      proof: ProofLike,
      options: {
        documentLoader: (url: string) => Promise<unknown>
        document: unknown
      }
    ): Promise<string>

    matchProof(options: {
      proof: ProofLike
      [key: string]: unknown
    }): Promise<boolean>

    ensureSuiteContext(options: {
      document: unknown
      addSuiteContext: boolean
    }): void
  }
}

declare module 'canonicalize' {
  function canonicalize(value: unknown): string | undefined
  export default canonicalize
}

declare module 'rdf-canonize' {
  export function canonize(dataset: unknown, options: unknown): Promise<string>
}

declare module '@interop/jsonld' {
  const jsonld: {
    toRDF(input: unknown, options?: unknown): Promise<unknown>
    [key: string]: unknown
  }
  export default jsonld
}

declare module 'ed25519-signature-2020-context' {
  interface SuiteContext {
    constants: { CONTEXT_URL: string }
    contexts: Map<string, unknown>
    CONTEXT_URL: string
    CONTEXT: unknown
    appContextMap: Map<string, unknown>
    documentLoader: (url: string) => unknown
  }
  const suiteContext: SuiteContext
  export default suiteContext
}
