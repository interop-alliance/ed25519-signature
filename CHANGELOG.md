# @interop/ed25519-signature Changelog

## 7.1.0 - 2026-06-07

### Added

- Export `EddsaJcs2022`, a ready-to-instantiate signing suite class for the
  `eddsa-jcs-2022` cryptosuite. It bakes in `createSignCryptosuite()` and
  exposes the same `new SuiteClass({ signer, date })` constructor contract as
  `Ed25519Signature2020`, so consumers that instantiate a suite by class (e.g.
  `@interop/ezcap`'s `ZcapClient`) can select `eddsa-jcs-2022`. Use
  `createVerifyCryptosuite()` for the verification side.

## 7.0.1 - 2026-06-02

### Changed

- (Types only) Bump `@interop/jsonld-signatures` to `^11.6.7` and
  `@interop/data-integrity-proof` to `^3.2.1`, which align their exported
  TypeScript definitions with the shared `@interop/data-integrity-core` types.
  The test document loader now types its return value with `IDocumentLoader`
  (from `@interop/data-integrity-core/loader`) in place of the removed
  `DocumentLoader` export from `@interop/jsonld-signatures`. No runtime or
  published API change.

## 7.0.0 - 2026-06-01

### Changed

- **BREAKING:** Swap dependencies onto the renamed, now-typed Interop forks:
  `@digitalbazaar/data-integrity` to `@interop/data-integrity-proof@^3.1.0`
  (`DataIntegrityProof`, `Cryptosuite`), and `@digitalcredentials/ssi` to
  `@interop/data-integrity-core@^6.1.0` (`ISigner`, `IVerifier`,
  `IVerificationMethod`, `IProofDescription`). Require
  `@interop/ed25519-verification-key@^7.0.0`.
- Because `@interop/data-integrity-proof` ships its own types, the
  `@digitalbazaar/data-integrity` ambient declaration is removed from
  `src/vendor.d.ts`; the local `ProofLike` / `CryptosuiteLike` types are
  replaced by upstream `IProofDescription` / `Cryptosuite`. The name-less
  `Ed25519Signature2020` cryptosuite types without a cast now that
  `Cryptosuite.name` is optional upstream.

## 6.0.0-6.0.1 - 2026-05-27

### Changed

- **BREAKING: Renamed** from `@digitalbazaar/ed25519-signature-2020` to
  `@interop/ed25519-signature` (rename-in-place; preserves git history and the
  committed spec test vectors).
- **BREAKING: New architecture.** The package now provides all three Ed25519
  proof flavors -- `Ed25519Signature2020`, `eddsa-rdfc-2022`, and
  `eddsa-jcs-2022` -- unified on the `DataIntegrityProof` container model. The
  legacy `Ed25519Signature2020` suite is now a thin subclass of
  `DataIntegrityProof` (not a `LinkedDataSignature` subclass); its signed bytes
  remain byte-identical to the legacy suite (pinned acceptance test).
- **BREAKING: New API surface.** Per-suite subpath exports
  (`./ed25519-signature-2020`, `./eddsa-rdfc-2022`, `./eddsa-jcs-2022`) plus a
  root barrel; `sideEffects: false` for tree-shaking. The three suites expose
  deliberately different shapes (class vs static cryptosuite vs sign/verify
  factories), matching their specs.
- **BREAKING: Ported to TypeScript** (`src/` to `dist/` via `tsc`); ESM-only,
  Node.js 20+. New pnpm + Vitest + Playwright + ESLint + Prettier toolchain
  (the karma/mocha/webpack stack was dropped).
- Single key library: `@interop/ed25519-verification-key` (reads Multikey +
  2020 + 2018 + JWK), replacing `@digitalbazaar/ed25519-multikey` and
  `@digitalbazaar/ed25519-verification-key-2020`.
- Uses `@interop/jsonld-signatures` as the `jsigs.sign` / `jsigs.verify` entry
  point and `@interop/jsonld` for RDFC-1.0 canonicalization.

### Added

- `eddsa-rdfc-2022` cryptosuite (DataIntegrityProof, RDFC-1.0).
- `eddsa-jcs-2022` sign/verify cryptosuite factories (DataIntegrityProof, JCS /
  RFC 8785), including the spec context-prefix ordering check.
- `createSigner` / `createVerifier` core helpers (inject the `algorithm`
  property `DataIntegrityProof` requires; idempotent).
- Mixed-proof-array verification test (one VC carrying all three proof types,
  disambiguated by `matchProof`).

### Fixed

- `eddsa-jcs-2022` verify: the context-prefix check now compares `@context`
  entries by value, not reference, so a VC carrying an inline `@context` object
  verifies after a JSON round-trip (the realistic transport path). The previous
  reference (`!==`) comparison, mirrored from the upstream spec reference impl,
  wrongly rejected such VCs.

## 5.4.0 - 2024-08-01

### Changed

- Use `jsonld-signature@11.3` to get `RDFC-1.0` implementation.

## 5.3.0 - 2024-06-15

### Added

- Add support for `Multikey` verification methods.

### Changed

- Loosen restrictions on verification methods that do not have
  contexts, allowing processing of well-known types in those cases.
- Allow `publiKeyJwk` to be used to express key material.

## 5.2.0 - 2023-02-13

### Removed

- Remove unused `expansionMap` from `matchProof()` as it was removed
  from `jsonld-signatures@11` which is required since version `5.0`.

## 5.1.0 - 2023-02-07

### Added

- Allow custom `canonizeOptions` to be passed in the construction of
  a suite as a stop-gap until hard requirements for canonize options
  are either set or advised to be certain values by a W3C working group.

## 5.0.0 - 2022-08-23

### Changed

- **BREAKING**: Use `jsonld-signatures@11` to get better safe mode
  protections when canonizing.

## 4.0.1 - 2022-06-06

### Changed

- Update to jsonld-signatures@10.

## 4.0.0 - 2022-06-06

### Changed

- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Require Node.js >=14.
- Update dependencies.
- Lint module.

## 3.0.0 - 2021-06-19

### Fixed

- **BREAKING**: Update to use new Ed25519VerificationKey2020 multicodec
  encoded key formats.

## 2.2.0 - 2021-05-26

### Added

- It is now possible to verify `Ed25519Signature2020` proofs using using
  2018 keys.

### Changed

- Replace `@transmute/jsonld-document-loader` with
  `@digitalbazaar/security-document-loader` in test.

## 2.1.0 - 2021-04-09

### Added

- Export the suite's context (and related objects such as context url,
  documentLoader, etc), and also set them as a property of the suite class.
- Set the `contextUrl` property on suite instance, to support context
  enforcement during the `sign()` operation that was added to `jsonld-signatures`
  `v9.0.1`.

## 2.0.1 - 2021-04-09

### Changed

- Use `ed25519-verification-key-2020@2.1.1`. Signer now has an "id" property.

## 2.0.0 - 2021-04-06

### Changed

- **BREAKING**: Update to use `jsonld-signatures` v9.0 (removes
  `verificationMethod` suite constructor param, makes key and signer validation
  stricter).
- Fix initializing signer and verifier object by passing it to superclass.

## 1.0.0 - 2021-03-19

### Added

- Initial files.
