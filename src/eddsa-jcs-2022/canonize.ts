export async function canonize(input: unknown): Promise<string> {
  // Imported dynamically: canonicalize@3 is ESM-only and its exports map
  // declares no `default`/`require` condition, so a static import keeps it in
  // the module graph and breaks CJS-path resolvers (e.g. tsx). Awaiting it here
  // resolves via the native ESM `import` condition instead.
  const { default: canonicalize } = await import('canonicalize')
  const result = canonicalize(input)
  if (result === undefined) {
    throw new TypeError('JCS canonicalize returned undefined for input')
  }
  return result
}
