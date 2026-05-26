export async function sha256({ string }: { string: string }): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(string)
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', bytes)
  )
}
