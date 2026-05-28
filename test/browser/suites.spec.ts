import { test, expect } from '@playwright/test'

const roundTrips = [
  { name: 'Ed25519Signature2020', fn: 'roundTrip2020' },
  { name: 'eddsa-rdfc-2022', fn: 'roundTripRdfc' },
  { name: 'eddsa-jcs-2022', fn: 'roundTripJcs' }
] as const

for (const { name, fn } of roundTrips) {
  test(`${name} signs and verifies in browser`, async ({ page }) => {
    await page.goto('/test/index.html')
    const verified = await page.evaluate(async fnName => {
      // Variable specifier (not a literal) so tsc doesn't try to resolve the
      // Vite-served URL; the dev server resolves it at runtime.
      const harnessUrl = '/test/browser/harness.ts'
      const harness = await import(harnessUrl)
      return (harness as Record<string, () => Promise<boolean>>)[fnName]!()
    }, fn)
    expect(verified).toBe(true)
  })
}
