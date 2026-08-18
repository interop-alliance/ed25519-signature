# Agent Guidelines

This file provides guidance to coding agents when working with code in this
repository.

## Overview

TypeScript library providing all three Ed25519 Verifiable Credential proof
flavors through one package, unified on the `DataIntegrityProof` container model:

| Suite                  | `proof.type`           | `proof.cryptosuite` | Canonicalization |
| ---------------------- | ---------------------- | ------------------- | ---------------- |
| `Ed25519Signature2020` | `Ed25519Signature2020` | (absent)            | RDFC-1.0         |
| `eddsa-rdfc-2022`      | `DataIntegrityProof`   | `eddsa-rdfc-2022`   | RDFC-1.0         |
| `eddsa-jcs-2022`       | `DataIntegrityProof`   | `eddsa-jcs-2022`    | JCS (RFC 8785)   |

Published as `@interop/ed25519-signature` (v6, a rename-in-place of
`@digitalbazaar/ed25519-signature-2020`). The full design and migration history
live in `refactor-plan.md`.

**Key architectural decision:** the legacy `Ed25519Signature2020` suite is a
**thin subclass of `DataIntegrityProof`**, not a `LinkedDataSignature` subclass
and not a bare cryptosuite. `DataIntegrityProof` hardcodes `proof.type`,
`proof.cryptosuite`, `this.contextUrl`, and `matchProof` — none reachable from a
cryptosuite plugin — so a subclass is the only way to emit a 2020-shaped proof
while reusing the container. This lets one package, one container, one key
library, and one toolchain cover all three suites.

Uses `@interop/ed25519-verification-key` as the single key library (it reads
Multikey + 2020 + 2018 + JWK), and `@interop/jsonld-signatures` as the
`jsigs.sign` / `jsigs.verify` entry point.

## Toolchain & Project Layout

### Package Manager

Use `pnpm` (not `npm` or `yarn`). The lockfile is `pnpm-lock.yaml`. Install deps
with `pnpm install`; run scripts with `pnpm run <script>` or `pnpm <script>`.

Several runtime/dev dependencies are `@interop/*` forks the owner controls and
publishes to npm: `@interop/data-integrity-core` (the shared types --
`ISigner`, `IVerifier`, `IProofDescription`, etc.), `@interop/data-integrity-proof`
(the `DataIntegrityProof` container + `Cryptosuite` type),
`@interop/ed25519-verification-key`, `@interop/jsonld-signatures`,
`@interop/jsonld`, and the `@interop/security-document-loader` devDependency
(which itself pulls in `@interop/did-io`, `@interop/did-method-key`, etc.). When
a fix belongs in one of these, prefer editing it upstream and republishing
rather than working around
it here.

### Build

The library is built with `tsc` (not `vite build`). `vite.config.ts` exists only
to configure Vitest and to serve TypeScript to Playwright. `pnpm run build`
(`rimraf dist/* && tsc`) compiles `src/` to `dist/` via `tsconfig.json`.

### Two tsconfigs

- `tsconfig.json` — library build only; `include: ["src/**/*"]`. `strict` and
  `noUncheckedIndexedAccess` are on; `moduleResolution: Bundler`,
  `verbatimModuleSyntax`.
- `tsconfig.dev.json` — extends the above with `noEmit: true`; adds
  `test/**/*.ts`, `vite.config.ts`, `playwright.config.ts` so type-aware checks
  cover all files.

Do not add test files to `tsconfig.json` — they would be emitted into `dist/`.
The `test` script does **not** run the dev typecheck; run
`npx tsc -p tsconfig.dev.json --noEmit` explicitly to verify test types.

### Tests

- `test/node/` — Vitest (`pnpm run test-node`); the active test suite.
- `test/browser/` — Playwright (`pnpm run test-browser`) via a Vite dev server
  (`pnpm run dev`), mirroring the verification-key package. There is no browser
  app; the `dev` server only serves/transforms TS source for Playwright. The
  specs (`suites.spec.ts`, one sign/verify round-trip per suite, exercising
  `sha256-browser.ts`) pass. They were previously blocked on
  `@digitalcredentials` loader-chain packaging bugs; switching to the
  `@interop/security-document-loader` fork (clean ESM, `@interop/did-io`) cleared
  them. See `refactor-plan.md` §13.
- `pnpm test` runs `lint`, then the `tsconfig.dev.json` typecheck, then
  `test-node`.

All tests live under `test/node/` (Vitest) and `test/browser/` (Playwright).
The fixtures (test vectors, mock keys/documents) are pinned in
`test/node/test-vectors.test.ts` and `test/node/mock-data.ts`.

### ESM & import paths

The package is ESM-only (`"type": "module"`). Local imports must use the `.js`
extension even though source files are `.ts` — e.g.
`import { canonize } from './canonize.js'`. `moduleResolution: Bundler` resolves
these to the `.ts` source at compile time.

### Subpath exports

`package.json` defines per-suite subpath exports plus a root barrel, and
`sideEffects: false`:

```
.                          → dist/index.js              (convenience barrel)
./ed25519-signature-2020   → dist/ed25519-signature-2020/index.js
./eddsa-rdfc-2022          → dist/eddsa-rdfc-2022/index.js
./eddsa-jcs-2022           → dist/eddsa-jcs-2022/index.js
```

The point of the subpaths is tree-shaking: a JCS-only consumer must not be
forced to pull in the heavy `jsonld` / `rdf-canonize` machinery that only the
RDFC suites need. Keep suite imports leaf-scoped (don't make the JCS path import
from the RDFC path) so this property holds.

## Architecture

### Source layout

```
src/
  index.ts                     barrel: re-exports all suites + core helpers
  vendor.d.ts                  ambient types for untyped runtime deps
  core/                        genuinely shared, deliberately thin
    createVerifier.ts          key import via @interop/ed25519-verification-key
    createSigner.ts            signer wrapper that injects `algorithm`
    sha256.ts / sha256-browser.ts   platform-split SHA-256
    requiredAlgorithm.ts       'Ed25519'
  ed25519-signature-2020/
    index.ts                   Ed25519Signature2020 (DataIntegrityProof subclass)
    cryptosuite.ts             internal cryptosuite, NO `name`
  eddsa-rdfc-2022/
    index.ts                   exported static cryptosuite object
    canonize.ts                RDFC-1.0 via @interop/jsonld + rdf-canonize
  eddsa-jcs-2022/
    index.ts                   createSignCryptosuite / createVerifyCryptosuite
    canonize.ts                JCS (RFC 8785) via `canonicalize`
    createVerifyData.ts        spec context-prefix handling (sign + verify)
```

### The three suites (API asymmetry is intentional)

The three suites expose **deliberately different shapes**, because the specs do.
Do not try to abstract over them:

- **`Ed25519Signature2020`** — a class extending `DataIntegrityProof`. The
  constructor passes an internal cryptosuite that has **no `name`** (so
  `this.cryptosuite` stays `undefined`, matching the absent `cryptosuite` field
  on 2020 proofs), sets `this.type = 'Ed25519Signature2020'` and
  `this.contextUrl` to the 2020 suite context, and overrides `updateProof()` to
  `delete proof.cryptosuite` (the base class writes it; 2020 proofs must not
  carry it). Reuses the base `createVerifyData` / `canonizeProof`, so the signed
  payload is `sha256(c14n proofOptions) ‖ sha256(c14n document)` over RDFC-1.0 —
  byte-identical to the legacy suite.
- **`eddsa-rdfc-2022`** — a single static cryptosuite object
  `{ canonize, createVerifier, name, requiredAlgorithm }`. Used with a bare
  `new DataIntegrityProof({ cryptosuite: eddsaRdfc2022, signer })`.
- **`eddsa-jcs-2022`** — split factories `createSignCryptosuite()` /
  `createVerifyCryptosuite()`. It needs a **custom `createVerifyData`** because
  JCS must avoid the JSON-LD steps the base `canonizeProof` performs. The sign
  cryptosuite's `createVerifier` throws (sign-only guard). The verify path
  enforces the spec's **context-prefix ordering check** (`document.@context`
  must start with `proof.@context`, in order) — this is security-sensitive; keep
  its dedicated test vectors, including a should-reject case.

### Shared core

- `createVerifier({ verificationMethod })` — imports the key via
  `Ed25519VerificationKey.from(...).verifier()`. Called by `DataIntegrityProof`
  internally during verification.
- `createSigner(keyPair)` / `ensureSignerAlgorithm(signer)` — helpers callers use
  to produce a signer for the sign path.
- `sha256` — Node (`node:crypto`) with a `crypto.subtle` browser variant,
  remapped via the `browser` field in `package.json`
  (`./dist/core/sha256.js` → `./dist/core/sha256-browser.js`). The JSON-LD/JCS
  canonicalizers are pure JS and need no split.
- `requiredAlgorithm = 'Ed25519'`.

No base58 / proofValue helpers live here: encoding is owned entirely by
`DataIntegrityProof.sign` (and its base58btc-or-base64url decode on verify). Our
suites encode nothing.

### The `algorithm` safety net

`DataIntegrityProof` asserts `signer.algorithm === requiredAlgorithm` at
construction and `verifier.algorithm === requiredAlgorithm` on verify. In the
Digital Bazaar ecosystem the **key library** supplies `algorithm`
(`@digitalbazaar/ed25519-multikey`'s `signer()`/`verifier()` set it).
`@interop/ed25519-verification-key` >= 7.0.0 now does the same, so in the
normal case the value is already set by the time it reaches us.

`@interop/data-integrity-core`'s `ISigner`/`IVerifier` still declare `algorithm`
as **optional**, though, so there is no type-level guarantee. We keep two
idempotent fallbacks (`x.algorithm ?? requiredAlgorithm`) as a safety net for
`ISigner`/`IVerifier` sources that leave `algorithm` unset:

- `core/createVerifier.ts` on the returned verifier.
- `core/createSigner.ts` on the signer (the `Ed25519Signature2020` constructor
  routes through `ensureSignerAlgorithm`).

Callers using a bare `DataIntegrityProof` with the rdfc/jcs suites can pass
`keyPair.signer()` directly when the key library sets `algorithm` (true for
`@interop/ed25519-verification-key` >= 7.0.0); `createSigner(keyPair)` remains
the safe choice for arbitrary `ISigner` sources.

### Types from upstream + ambient types (`src/vendor.d.ts`)

`DataIntegrityProof` and the `Cryptosuite` type come from
`@interop/data-integrity-proof` (it ships its own TypeScript types), and
`ISigner` / `IVerifier` / `IVerificationMethod` / `IProofDescription` come from
`@interop/data-integrity-core`. `IProofDescription` (the loose proof / proof-
options shape) replaces the old local `ProofLike`; the upstream `Cryptosuite`
type (with `name` made **optional**) replaces the old local `CryptosuiteLike`,
which is why the name-less `Ed25519Signature2020` cryptosuite now types without a
cast.

`src/vendor.d.ts` therefore only declares the genuinely untyped runtime deps:
`canonicalize`, `rdf-canonize`, `@interop/jsonld`, and
`ed25519-signature-2020-context`.

`@interop/data-integrity-proof`'s `DataIntegrityProof` is already structurally
assignable to jsigs `LinkedDataProof` (it `extends` it). Note its `verifyProof`
keeps a wide `proof: any` param precisely so the override stays assignable to the
base (whose `verifyProof` declares `proof: object`); `IProofDescription` is
narrower than `object`, so do not narrow that param upstream.

### Byte-identical interop gate

The 2020-subclass relabeling is only lossless if its signed bytes match the
legacy `@digitalbazaar/ed25519-signature-2020` suite. That equality is the hard
acceptance test (`refactor-plan.md` §8) and is fixture-pinned in
`test/node/ed25519-signature-2020.test.ts` and `test-vectors.test.ts`. Because
the signed payload includes `sha256(c14n document)`, this gate is **only correct
when canonicalization runs against real, complete JSON-LD contexts** — see the
testing rule below, which exists precisely because a stubbed context once broke
this gate.

### Dependency note

`eddsa-rdfc-2022/canonize.ts` uses `@interop/jsonld` (not plain `jsonld`) to
match the jsonld instance used by `@interop/jsonld-signatures`. Keeping them the
same instance eliminates a class of subtle canonicalization differences.

## Testing — document loaders and contexts

**Always build test document loaders from
`@interop/security-document-loader`'s `securityLoader()`. Never
hand-roll JSON-LD `@context` documents in tests.**

```ts
import { securityLoader } from '@interop/security-document-loader'

export function buildDocumentLoader(extra = {}) {
  const loader = securityLoader() // real VC v1/v2, ed25519-2020, did, DI contexts
  for (const [url, document] of Object.entries({ ...mockDocs, ...extra })) {
    loader.addStatic(url, document)
  }
  return loader.build()
}
```

`addStatic` is **only** for things that are genuinely not published contexts:
mock keys, controller/DID documents, and the `examples/v2` `@vocab` context used
by the spec fixtures. Everything else (the VC v1/v2 contexts, the ed25519-2020
suite context, the data-integrity contexts, the multikey context) is already
bundled by `securityLoader()` — use it, don't restate it.

We use `@interop/security-document-loader` (the Interop fork of the DCC loader)
deliberately: it is what the rest of the Interop ecosystem uses, so tests
exercise real cross-library interop. It is a clean ESM build (pulling
`@interop/did-io`, `@interop/did-method-key`, etc.) that also bundles for the
browser, which the DCC original did not.

### Why this is a hard rule, not a style preference

A hand-written context that lists the right term→IRI mappings but omits the
JSON-LD **type coercions** will canonicalize to different RDF, and therefore
produce a different signature — while still passing a naive sign/verify
round-trip (you signed and verified against the same wrong bytes). It only
surfaces as a failure against real interop, e.g. the byte-identical
`Ed25519Signature2020` gate.

This actually happened here. A stubbed `credentials/v1` context defined:

```jsonc
"issuer": "https://www.w3.org/2018/credentials#issuer",
"issuanceDate": "https://www.w3.org/2018/credentials#issuanceDate"
```

instead of the real coercions:

```jsonc
"issuer":       { "@id": "...#issuer", "@type": "@id" },
"issuanceDate": { "@id": "...#issuanceDate", "@type": "xsd:dateTime" }
```

So `issuer` canonicalized as a string literal instead of an IRI, and
`issuanceDate` lost its `xsd:dateTime` datatype. The document hash differed from
every other implementation's, the byte-identical interop gate failed, and the
investigation chased the key library and the `created` timestamp before the
loader turned out to be the culprit. The proof-options hash and the signing key
were correct the whole time.

**If a context appears to be "missing," add the real context package (or
`addStatic` the actual published context document) — never approximate it by
hand.** A wrong context fails loudly only at interop time; by then it has
already cost you the signature.

## Conventions

Code style, refactoring, JSDoc, comment, and error-handling conventions live in
@CONTRIBUTING.md -- follow them.
