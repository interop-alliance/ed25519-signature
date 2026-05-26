# Refactor Plan: `@interop/ed25519-signature`

A combined Ed25519 Linked Data / Data Integrity signature library, ported to
TypeScript and unified on the `DataIntegrityProof` plugin model. Folds three
proof flavors into one package:

- `Ed25519Signature2020` — legacy proof (`type: Ed25519Signature2020`)
- `eddsa-rdfc-2022` — Data Integrity proof, RDFC-1.0 canonicalization
- `eddsa-jcs-2022` — Data Integrity proof, JCS (RFC 8785) canonicalization

## 1. Goal

Let a downstream consumer issue and verify all three Ed25519 proof types -- as
they appear mixed in VC `proof` arrays and DID documents -- through **one
package, one container concept (`DataIntegrityProof`), one plugin style, one
key library, one toolchain**. No more juggling the `LinkedDataSignature`
subclass ecosystem alongside the `DataIntegrityProof` cryptosuite ecosystem.

The key architectural decision (already validated against the installed
`@digitalbazaar/data-integrity` source): the legacy `Ed25519Signature2020`
suite is re-expressed as a **thin subclass of `DataIntegrityProof`**, not as a
`LinkedDataSignature` subclass and not as a bare cryptosuite.
`DataIntegrityProof`
hardcodes `proof.type`, `proof.cryptosuite`, `this.contextUrl`, and `matchProof`
(see `DataIntegrityProof.js:175`, `:193`, `:57`, `:420`), none of which are
reachable from a cryptosuite plugin -- so a subclass is required to emit a
2020-shaped proof.

## 2. Package identity (rename in place)

This repo is reused, not replaced -- mirroring how
`@interop/ed25519-verification-key`
was a rename-in-place of the `ed25519-verification-key-2020` fork.

| Field       | From                                    | To                                                    |
|-------------|-----------------------------------------|-------------------------------------------------------|
| npm name    | `@digitalbazaar/ed25519-signature-2020` | `@interop/ed25519-signature`                          |
| GitHub repo | `ed25519-signature-2020`                | `ed25519-signature` (rename together with npm)        |
| version     | `5.4.1-0`                               | `6.0.0` (major: new scope, new architecture, new API) |
| language    | JS (`lib/`)                             | TS (`src/` to `dist/`)                                |

Preserve git history and the committed spec test vectors (commit `2d1337b`,
"Add test vectors from vc-di-eddsa spec") -- they gate the interop acceptance
test in section 8.

## 3. Source layout

One module per suite over a small shared core. Each suite owns its distinctive
parts (canonicalizer, `createVerifyData` where needed, proof envelope); only the
genuinely common pieces live in `core/`.

```
src/
  index.ts                     // re-exports everything (convenience barrel)
  core/
    createVerifier.ts          // key import via @interop/ed25519-verification-key
    sha256.ts                  // platform sha256 (node / browser split)
    requiredAlgorithm.ts       // 'Ed25519'
  ed25519-signature-2020/
    index.ts                   // Ed25519Signature2020 (DataIntegrityProof subclass)
    cryptosuite.ts             // RDFC canonize + createVerifier, name omitted
  eddsa-rdfc-2022/
    index.ts                   // exported cryptosuite object
    canonize.ts                // RDFC-1.0 via jsonld + rdf-canonize
  eddsa-jcs-2022/
    index.ts                   // createSignCryptosuite / createVerifyCryptosuite
    canonize.ts                // JCS (RFC 8785) via `canonicalize`
    createVerifyData.ts        // spec context-prefix handling (sign + verify variants)
```

Platform crypto split (matching the verification-key package's `ed25519*.ts`
pattern): `core/sha256.ts` + `core/sha256-browser.ts`, remapped via the
`browser` field in `package.json`. RDFC's `jsonld`/`rdf-canonize` and JCS's
`canonicalize` are pure-JS and need no per-platform split.

## 4. The three suites

### 4.1 `Ed25519Signature2020` (DataIntegrityProof subclass)

```ts
class Ed25519Signature2020 extends DataIntegrityProof {
  constructor({signer, date} = {}) {
    // cryptosuite has NO `name`, so this.cryptosuite stays undefined
    super({signer, date, cryptosuite: ed25519Sig2020Cryptosuite});
    this.type = 'Ed25519Signature2020';
    this.contextUrl = 'https://w3id.org/security/suites/ed25519-2020/v1';
  }

  // runs at DataIntegrityProof.js:196, before proof options are hashed
  async updateProof({proof}) {
    delete proof.cryptosuite;   // 2020 proofs carry no cryptosuite field
    return proof;
  }
}
```

`ed25519Sig2020Cryptosuite` = `{ canonize /* RDFC-1.0 */, createVerifier,
requiredAlgorithm: 'Ed25519' }` (no `name`, so `this.cryptosuite` is
`undefined`).

`matchProof` likely needs no override: base impl is
`type === this.type && cryptosuite === this.cryptosuite`, which resolves to
`'Ed25519Signature2020' === 'Ed25519Signature2020' && undefined === undefined`
for a 2020 proof, and won't match a `DataIntegrityProof` proof. Confirm with a
test; override only if a real proof shape breaks it.

Because this reuses the base `createVerifyData` / `canonizeProof`, with
`this.contextUrl` set to the 2020 context, the signed payload is
`sha256(c14n proofOptions) || sha256(c14n document)` over RDFC-1.0 -- the same
construction the legacy suite uses. Byte-identical interop is the acceptance
gate (section 8).

### 4.2 `eddsa-rdfc-2022`

Port the existing DB cryptosuite essentially unchanged: a static object
`{ canonize, createVerifier, name: 'eddsa-rdfc-2022', requiredAlgorithm: 'Ed25519' }`.
`canonize` = RDFC-1.0 via `jsonld.toRDF` + `rdf-canonize` (current
`lib/canonize.js` logic). Uses the base `DataIntegrityProof.createVerifyData`.

### 4.3 `eddsa-jcs-2022`

Port the DB split-factory shape -- do **not** collapse it into one object:

- `createSignCryptosuite()` and `createVerifyCryptosuite()`
- custom `createVerifyData` (the base `canonizeProof` does JSON-LD things JCS
  must avoid). Implements the spec context-prefix steps: on sign, copy
  `document['@context']` onto `proof`; on verify, assert `document['@context']`
  **starts with** `proof['@context']` in order before adopting it. This ordering
  check is security-sensitive -- give it dedicated test vectors.
- `canonize` = JCS / RFC 8785 via the `canonicalize` package (no JSON-LD, no
  documentLoader)
- the sign cryptosuite's `createVerifier` throws (sign-only guard)

## 5. Shared core

Genuinely common across all three (kept deliberately thin):

- `createVerifier({ verificationMethod })` -- import via
  `@interop/ed25519-verification-key` `.from(...).verifier()`, replacing
  `@digitalbazaar/ed25519-multikey`. This is the payoff of the verification-key
  superset: one key library handling Multikey + 2020 + 2018.
- `sha256` (platform split)
- `requiredAlgorithm = 'Ed25519'`

No base58/proofValue helpers: encoding is owned entirely by
`DataIntegrityProof.sign` (`DataIntegrityProof.js:100-101`) and the
base58btc-or-base64url decode fallback on verify (`:143-150`). Our suites encode
nothing themselves -- so there is no `core/baseX.ts` and no direct
`base58-universal` dependency (see section 6).

## 6. Dependencies

Runtime:

- `@digitalbazaar/data-integrity` -- the `DataIntegrityProof` container.
  Local copy of this repo located at: /home/dmitri/code/DigitalBazaar/data-integrity
- `@interop/ed25519-verification-key` -- key import / verifier (replaces
  `@digitalbazaar/ed25519-multikey` and
  `@digitalbazaar/ed25519-verification-key-2020`).
- `jsonld`, `rdf-canonize` -- RDFC-1.0 (rdfc-2022 + the 2020 subclass)
- `canonicalize` -- JCS (jcs-2022)
- `@interop/jsonld-signatures` -- `jsigs.sign` / `jsigs.verify` entry points (
  peer/runtime)
- context packages: `ed25519-signature-2020-context`,
  `@digitalbazaar/data-integrity-context`

Dropped: `@digitalbazaar/ed25519-multikey`,
`@digitalbazaar/ed25519-verification-key-2020`, `base58-universal` (proofValue
encoding stays owned by `DataIntegrityProof.sign`; see section 5).

Duplicate-encoding-dep note: the tree will carry both `@scure/base` (via
`@interop/ed25519-verification-key`) and `base58-universal` +
`base64url-universal` (transitively via `@digitalbazaar/data-integrity`) -- two
small base58 implementations. We accept this rather than forking
`data-integrity`: a fork is a permanent maintenance burden (tracking an actively
maintained upstream) far out of proportion to shedding two tiny, well-isolated
encoding libs, and `DataIntegrityProof.sign` owning `proofValue` formatting
keeps us from re-implementing and drifting from upstream. If the dedup ever
matters, the proportionate move is an upstream PR switching `data-integrity` to
`@scure/base`, not a fork. Deferred.

Dev (match verification-key): `typescript`, `vitest`, `@vitest/coverage-v8`,
`@playwright/test`, `eslint` + `typescript-eslint`, `prettier`, `rimraf`,
`@types/node`. Drop the entire karma/mocha/webpack/c8 stack.

### Dependency-weight note

RDFC + the 2020 subclass pull in `jsonld` + `rdf-canonize` (heavy); JCS pulls in
only `canonicalize` (tiny). To avoid forcing `jsonld` onto JCS-only consumers,
rely on subpath exports (section 7) + `sideEffects: false` so bundlers
tree-shake the JSON-LD machinery out. (Optional future step: make
`jsonld`/`rdf-canonize` optional peers; deferred -- most VC consumers already
have `jsonld` in the tree.)

## 7. `package.json` exports

Per-suite subpaths so JCS-only consumers tree-shake the JSON-LD deps, plus a
convenience root barrel:

```jsonc
{
  "name": "@interop/ed25519-signature",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".":                      { "types": "./dist/index.d.ts",                          "default": "./dist/index.js" },
    "./ed25519-signature-2020": { "types": "./dist/ed25519-signature-2020/index.d.ts", "default": "./dist/ed25519-signature-2020/index.js" },
    "./eddsa-rdfc-2022":      { "types": "./dist/eddsa-rdfc-2022/index.d.ts",          "default": "./dist/eddsa-rdfc-2022/index.js" },
    "./eddsa-jcs-2022":       { "types": "./dist/eddsa-jcs-2022/index.d.ts",           "default": "./dist/eddsa-jcs-2022/index.js" }
  },
  "browser": { "./dist/core/sha256.js": "./dist/core/sha256-browser.js" }
}
```

Toolchain config to copy from the verification-key package: `tsconfig.json`
(library build, `src/**` only) + `tsconfig.dev.json` (`noEmit`, adds `test/**`,
`vite.config.ts`, `playwright.config.ts`), `eslint.config.js`,
`prettier.config.js`, `vite.config.ts`, `playwright.config.ts`, ESM with `.js`
import extensions on local imports, `moduleResolution: Bundler`.

## 8. Tests & acceptance criteria

Test layout matches verification-key: `test/node/` (Vitest), `test/browser/`
(Playwright via Vite dev server).

Port and expand:

- existing `test/Ed25519Signature2020.spec.js` (sign/verify round-trips)
- existing `test/test-vectors.*` spec vectors (commit `2d1337b`)
- new rdfc-2022 and jcs-2022 spec vectors (from the DB cryptosuite repos)
- mixed-proof-array verify test: one `jsigs.verify` call with
  `[new Ed25519Signature2020(), new DataIntegrityProof({cryptosuite: eddsaRdfc2022}),
  new DataIntegrityProof({cryptosuite: createVerifyCryptosuite()})]`,
  disambiguated by `matchProof`.

**Hard gate -- byte-identical 2020 interop.** The 2020-subclass relabeling is
lossless only if the signed bytes match the legacy suite. Required test:

1. Sign a VC with the new `Ed25519Signature2020` subclass; verify it with the
   legacy `@digitalbazaar/ed25519-signature-2020` (kept as a devDependency).
2. The reverse: sign with the legacy suite, verify with the new subclass.
3. Both existing spec test vectors continue to verify.

If any of these fail, the proof-options canonicalization diverges and the
subclass approach must be adjusted before proceeding.

JCS-specific gate: test vectors exercising the context-prefix ordering check
(`document.@context` must start with `proof.@context`), including a
should-reject case.

## 9. Migration phases

1. **Scaffold toolchain.** Copy TS/pnpm/vitest/playwright/eslint/prettier config
   from `@interop/ed25519-verification-key`; set up the two tsconfigs; add
   `package.json` rename + exports + scripts. `pnpm install`.
2. **Shared core.** `core/createVerifier.ts` (on
   `@interop/ed25519-verification-key`),
   `core/sha256.ts` (+ browser split), `requiredAlgorithm`.
3. **eddsa-rdfc-2022.** Port `canonize.ts` + cryptosuite object; round-trip
   test.
4. **Ed25519Signature2020 subclass.** Implement; run the byte-identical interop
   gate (section 8) immediately -- this is the riskiest step, surface failures
   early.
5. **eddsa-jcs-2022.** Port split factories + custom `createVerifyData` +
   context-prefix checks; add JCS vectors.
6. **Barrel + subpath exports.** Wire `src/index.ts` and verify tree-shaking
   (JCS-only import must not pull `jsonld`).
7. **Tests green** in Node and browser; mixed-proof-array test passes.
8. **Docs.** Rewrite README (three suites, subpath imports, the sign/verify
   asymmetry note); add `CLAUDE.md` modeled on the verification-key one; update
   CHANGELOG with the rename + major bump.
9. **Rename GitHub repo** to `ed25519-signature` (together with the npm rename).

## 10. Decisions

Resolved:

- **Repo + package rename.** Owner will handle the npm scope change and GitHub
  repo rename together. No external consumers depend on this yet, so there is no
  migration window to manage and the old DB package is irrelevant here.
- **base58 helpers.** Resolved: encoding stays owned by `DataIntegrityProof.sign`;
  no `core/baseX.ts`, no direct `base58-universal` dep. The small transitive
  encoding-lib duplication is accepted rather than forking `data-integrity`
  (see section 6).

Deferred:

- **`jsonld` as optional peer.** Revisit only if JCS-only bundle size becomes a
  real concern.
- **Upstream PR to switch `data-integrity` to `@scure/base`.** The proportionate
  way to remove the encoding-dep duplication, if it ever matters.

Inherent (document, don't fight):

- **API asymmetry across suites** -- static cryptosuite (`eddsa-rdfc-2022`) vs
  sign/verify factories (`eddsa-jcs-2022`) vs `DataIntegrityProof` subclass
  (`Ed25519Signature2020`). Comes from the specs; document it, don't abstract
  over it.

## 11. Progress (session 2026-05-26)

### What was implemented

Phase 1 (scaffold) through Phase 6 (barrel) are complete. The repo now has:

- `package.json` renamed to `@interop/ed25519-signature` v6.0.0, with subpath
  exports, `sideEffects: false`, and `browser` sha256 redirect.
- Toolchain files: `tsconfig.json`, `tsconfig.dev.json`, `eslint.config.js`,
  `prettier.config.js`, `vite.config.ts`, `playwright.config.ts`, `.npmrc`.
- **`src/` source tree** (TypeScript, builds clean):
  - `core/`: `createVerifier.ts`, `sha256.ts`, `sha256-browser.ts`,
    `requiredAlgorithm.ts`
  - `ed25519-signature-2020/`: `index.ts` (`DataIntegrityProof` subclass),
    `cryptosuite.ts` (internal cryptosuite with no `name`)
  - `eddsa-rdfc-2022/`: `canonize.ts` (RDFC-1.0 via `@interop/jsonld` +
    `rdf-canonize`), `index.ts`
  - `eddsa-jcs-2022/`: `canonize.ts` (JCS via `canonicalize`),
    `createVerifyData.ts` (context-prefix sign/verify logic),
    `index.ts` (split factories)
  - `index.ts` barrel, `vendor.d.ts` (module declarations for untyped deps)
- **`test/node/`**: four vitest test files + `mock-data.ts` + `documentLoader.ts`
- `dist/` builds successfully.

### Test status: 19/19 passing

All node tests green, including the byte-identical interop gate (§8) and the
JCS context-prefix ordering checks.

### Byte-identical interop gate — root cause (resolved)

The 4 gate failures were **not** a signing-key or canonicalization-algorithm
problem, and **not** the `created` timestamp. They were caused by the test's
hand-rolled `documentLoader` serving an **incomplete `credentials/v1` (and
`v2`) context** that dropped the VC type coercions (`issuer` → `@type: @id`,
`issuanceDate` → `@type: xsd:dateTime`). Without those coercions, the document
canonicalized with `issuer` as a string literal (not an IRI) and `issuanceDate`
without its datatype, producing a different document hash → different signature.

Confirmed empirically by running the real legacy
`@digitalbazaar/ed25519-signature-2020` end-to-end and decomposing the 64-byte
verifyData (`sha256(proofOptions) ‖ sha256(document)`):

- proof-options hash matched byte-for-byte (so `created` and proof shape were
  never the issue),
- document hash differed — and restoring the coercions made the new subclass
  emit the exact spec `proofValue`.

Also ruled out: the key/seed. `@interop/ed25519-verification-key` (Node build,
`node:crypto`, first-32-byte seed) derives the public key matching the stated
one and signs identically to the legacy `ed25519-verification-key-2020` — the
seed-derivation hypothesis was wrong.

**Fix applied:** `test/node/documentLoader.ts` now uses
`@digitalcredentials/security-document-loader`'s `securityLoader()` (real
bundled VC v1/v2, ed25519-2020, did, data-integrity contexts; did:key
resolver), with `addStatic` for the mock/spec keys + controllers and the
`examples/v2` `@vocab` context. The DCC fork is used deliberately to exercise
interop with the rest of that ecosystem. The hand-rolled
`data-integrity/v2` overrides in the rdfc/jcs tests were removed (the loader
bundles the real one).

### `signer.algorithm` — resolved via shared helper

`DataIntegrityProof._processSignatureParams` asserts `signer.algorithm ===
requiredAlgorithm` at construction, and `verifySignature` asserts the same on
`verifier.algorithm`. In the DB ecosystem the **key library** supplies
`algorithm` (`@digitalbazaar/ed25519-multikey`'s `signer()`/`verifier()` both
set it). `@interop/ed25519-verification-key` does not (its `ISigner.algorithm`
is optional), so we inject it — now in one place:

- `core/createSigner.ts` — `createSigner(keyPair)` / `ensureSignerAlgorithm(signer)`
  wrap a signer with `algorithm: signer.algorithm ?? requiredAlgorithm`
  (idempotent). Exported from the barrel; used by the rdfc/jcs tests instead of
  the scattered manual `{ ...keyPair.signer(), algorithm: 'Ed25519' }`.
- `core/createVerifier.ts` injects `verifier.algorithm ?? requiredAlgorithm`
  (now idempotent too).
- `Ed25519Signature2020` constructor uses `ensureSignerAlgorithm`.

The `?? requiredAlgorithm` fallbacks mean this stays correct once the key
library (and `@digitalcredentials/ssi`) start setting `algorithm` themselves —
the planned upstream fix that will let these injections become no-ops.

### Dependency note

We use `@interop/jsonld` (not plain `jsonld`) in `eddsa-rdfc-2022/canonize.ts`
to match the jsonld instance used by `@interop/jsonld-signatures`. Using the
npm `jsonld@9.0.0` instead produced no observable difference in this test, but
keeping them consistent eliminates one variable.

### Next steps

1. (Upstream, owner-controlled) Set `algorithm: 'Ed25519'` on
   `@interop/ed25519-verification-key`'s `signer()`/`verifier()` and add the
   property to `@digitalcredentials/ssi`'s `ISigner`/`IVerifier`. The in-repo
   injections then become no-ops.
2. `tsconfig.dev.json` typecheck is now clean: `src/vendor.d.ts`'s
   `DataIntegrityProof` gained a `derive` method and its `createProof`/
   `verifyProof` input params were widened (optional `proofSet`, `proof: object`)
   so it is structurally assignable to jsigs `LinkedDataProof`; test-side
   `jsigs.sign()` results (typed `object`) are annotated `any` where `.proof` is
   read. Consider wiring this typecheck into the `test` script so it stays green.
3. Phase 8 (docs/CHANGELOG). `CLAUDE.md` is written (see below for two
   unverified claims to confirm); README rewrite + CHANGELOG remain.

### Finalization checklist (next session, fresh context)

Current state: 19/19 node tests pass; `pnpm run build`, `pnpm run lint`, and
`npx tsc -p tsconfig.dev.json --noEmit` are all clean. `CLAUDE.md` was just
written (expanded from the verification-key one). Remaining to finalize:

1. **Verify two `CLAUDE.md` claims** (a verification Bash run was interrupted
   before confirming them — fix the wording if wrong):
   - The "Tests" section says `test/browser/` holds Playwright tests "mirroring
     the verification-key package." There is **no `test/browser/` directory yet**
     — confirm `playwright.config.ts`'s `testDir` and either create the browser
     tests (Phase 7) or soften the wording to "configured but not yet added."
   - The testing section claims `securityLoader()` bundles "the multikey
     context." Confirm whether `@digitalbazaar/data-integrity-context` (looped in
     by the DCC loader) actually serves `https://w3id.org/security/multikey/v1`.
     If not, the spec fixture's Multikey verification method is resolved via the
     did:key driver / `addStatic`, not a bundled context — correct the claim.
2. **Phase 7 browser tests.** Add `test/browser/` (Playwright via the Vite dev
   server) covering at least one sign/verify round-trip per suite, so the
   `sha256-browser.ts` path and ESM browser resolution are exercised. Confirm
   `pnpm run test-browser` passes.
3. **Mixed-proof-array verify test** (plan §8): one `jsigs.verify` call with
   `[new Ed25519Signature2020(), new DataIntegrityProof({cryptosuite: eddsaRdfc2022}),
   new DataIntegrityProof({cryptosuite: createVerifyCryptosuite()})]` over a VC
   carrying all three proof types, disambiguated by `matchProof`. Not yet
   written.
4. **README rewrite.** Three suites, subpath imports, the sign/verify API
   asymmetry, and the `createSigner` requirement for bare `DataIntegrityProof`
   usage. Point at this plan and `CLAUDE.md`.
5. **CHANGELOG.** Record the rename (`@digitalbazaar/ed25519-signature-2020` to
   `@interop/ed25519-signature`), the v6 major bump, the new architecture
   (DataIntegrityProof subclass + three suites), and the new TS/pnpm toolchain.
6. **Optional: wire `tsc -p tsconfig.dev.json --noEmit` into the `test` script**
   (or a `typecheck` script + CI step) so test-type regressions are caught.
7. **Upstream (owner-controlled), then simplify here:** once
   `@interop/ed25519-verification-key`'s `signer()`/`verifier()` and
   `@digitalcredentials/ssi`'s `ISigner`/`IVerifier` set `algorithm: 'Ed25519'`,
   the in-repo injections become no-ops. They are written idempotently
   (`x.algorithm ?? requiredAlgorithm`), so nothing breaks in the interim; revisit
   whether to keep `core/createSigner` as the blessed caller helper or drop it.
8. **Phase 9: rename the GitHub repo** to `ed25519-signature` together with the
   npm scope change (owner handles).

