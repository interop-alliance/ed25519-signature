import * as rdfCanonize from 'rdf-canonize'
import jsonld from '@interop/jsonld'

export async function canonize(
  input: unknown,
  options?: unknown
): Promise<string> {
  const opts: Record<string, unknown> = {
    algorithm: 'RDFC-1.0',
    format: 'application/n-quads',
    base: null,
    safe: true,
    ...(options as Record<string, unknown> | undefined),
    rdfDirection: 'i18n-datatype',
    produceGeneralizedRdf: false
  }
  const { format, ...rdfOpts } = opts
  const dataset = await jsonld.toRDF(input, rdfOpts)
  return rdfCanonize.canonize(dataset, { algorithm: 'RDFC-1.0', format })
}
