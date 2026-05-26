import { securityLoader } from '@digitalcredentials/security-document-loader'
import type { DocumentLoader } from '@interop/jsonld-signatures'
import {
  controllerDoc2020,
  mockPublicKey2020,
  specControllerDoc,
  specPublicKey
} from './mock-data.js'

// The vc-di-eddsa example contexts are not bundled by the security loader.
// `examples/v2` is just an `@vocab` mapping (matching the published context).
const EXAMPLES_V2_URL = 'https://www.w3.org/ns/credentials/examples/v2'
const EXAMPLES_V2_CONTEXT = {
  '@context': { '@vocab': 'https://www.w3.org/ns/credentials/examples#' }
}

const STATIC_DOCS: Record<string, unknown> = {
  [mockPublicKey2020.controller]: controllerDoc2020,
  [mockPublicKey2020.id]: mockPublicKey2020,
  [specPublicKey.controller]: specControllerDoc,
  [specPublicKey.id]: specPublicKey,
  [EXAMPLES_V2_URL]: EXAMPLES_V2_CONTEXT
}

export function buildDocumentLoader(
  extra: Record<string, unknown> = {}
): DocumentLoader {
  const loader = securityLoader()
  for (const [url, document] of Object.entries({ ...STATIC_DOCS, ...extra })) {
    loader.addStatic(url, document)
  }
  return loader.build()
}

export const documentLoader = buildDocumentLoader()
