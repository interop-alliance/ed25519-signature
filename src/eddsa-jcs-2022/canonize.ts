import canonicalize from 'canonicalize'

export async function canonize(input: unknown): Promise<string> {
  const result = canonicalize(input)
  if (result === undefined) {
    throw new TypeError('JCS canonicalize returned undefined for input')
  }
  return result
}
