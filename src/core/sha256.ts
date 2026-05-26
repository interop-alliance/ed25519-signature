import crypto from 'node:crypto'

export async function sha256({ string }: { string: string }): Promise<Uint8Array> {
  return new Uint8Array(crypto.createHash('sha256').update(string).digest())
}
