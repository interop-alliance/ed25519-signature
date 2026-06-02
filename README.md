# @interop/ed25519-signature

[![Node.js CI](https://github.com/interop-alliance/ed25519-signature/workflows/CI/badge.svg)](https://github.com/interop-alliance/ed25519-signature/actions?query=workflow%3A%22CI%22)
[![NPM Version](https://img.shields.io/npm/v/@interop/ed25519-signature.svg)](https://npm.im/@interop/ed25519-signature)

> Ed25519 Linked Data / Data Integrity signature suites for use with
> [`jsonld-signatures`](https://github.com/digitalbazaar/jsonld-signatures),
> in TypeScript.

One package providing all three Ed25519 Verifiable Credential proof flavors,
unified on the `DataIntegrityProof` container model:

| Suite                  | `proof.type`           | `proof.cryptosuite` | Canonicalization |
| ---------------------- | ---------------------- | ------------------- | ---------------- |
| `Ed25519Signature2020` | `Ed25519Signature2020` | (absent)            | RDFC-1.0         |
| `eddsa-rdfc-2022`      | `DataIntegrityProof`   | `eddsa-rdfc-2022`   | RDFC-1.0         |
| `eddsa-jcs-2022`       | `DataIntegrityProof`   | `eddsa-jcs-2022`    | JCS (RFC 8785)   |

This is a TypeScript rewrite and rename-in-place of
`@digitalbazaar/ed25519-signature-2020` (v6). The full design and migration
history live in [`refactor-plan.md`](./refactor-plan.md); contributor-facing
architecture notes are in [`CLAUDE.md`](./CLAUDE.md).

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Subpath imports](#subpath-imports)
- [Usage](#usage)
  - [`Ed25519Signature2020`](#ed25519signature2020)
  - [`eddsa-rdfc-2022`](#eddsa-rdfc-2022)
  - [`eddsa-jcs-2022`](#eddsa-jcs-2022)
  - [Verifying a mixed proof set](#verifying-a-mixed-proof-set)
- [API asymmetry across suites](#api-asymmetry-across-suites)
- [The `createSigner` requirement](#the-createsigner-requirement)
- [Contribute](#contribute)
- [License](#license)

## Background

Lets a downstream consumer issue and verify all three Ed25519 proof types -- as
they appear mixed in VC `proof` arrays and DID documents -- through one package,
one container concept (`DataIntegrityProof`), one key library
([`@interop/ed25519-verification-key`](https://github.com/interop-alliance/ed25519-verification-key),
which reads Multikey + 2020 + 2018 + JWK), and one toolchain.

The legacy `Ed25519Signature2020` suite is implemented as a thin subclass of
`DataIntegrityProof` rather than a `LinkedDataSignature` subclass, so the
container, key library, and signing payload are shared with the
data-integrity suites. Its signed bytes are byte-identical to the legacy
`@digitalbazaar/ed25519-signature-2020` suite (a pinned acceptance test).

Related spec: [Verifiable Credential Data Integrity / EdDSA Cryptosuites](https://w3c.github.io/vc-di-eddsa/).

## Install

Node.js 20+ and modern browsers are supported. This package is ESM-only.

```
npm install @interop/ed25519-signature
```

`@interop/jsonld-signatures` is an optional peer dependency -- install it
alongside if you use the `jsigs.sign` / `jsigs.verify` entry points shown below.

## Subpath imports

Each suite has its own subpath export, so a JCS-only consumer is not forced to
pull in the heavy `jsonld` / `rdf-canonize` machinery that only the RDFC suites
need (the package is `sideEffects: false` for tree-shaking). Prefer the
leaf-scoped import for the suite you actually use:

```js
import { Ed25519Signature2020 } from '@interop/ed25519-signature/ed25519-signature-2020'
import { eddsaRdfc2022 } from '@interop/ed25519-signature/eddsa-rdfc-2022'
import {
  createSignCryptosuite,
  createVerifyCryptosuite
} from '@interop/ed25519-signature/eddsa-jcs-2022'
```

A convenience root barrel re-exports everything (plus `createSigner` /
`createVerifier`) for when bundle size is not a concern:

```js
import {
  Ed25519Signature2020,
  eddsaRdfc2022,
  createSigner
} from '@interop/ed25519-signature'
```

## Usage

The examples share this setup:

```js
import jsigs from '@interop/jsonld-signatures'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'

const {
  purposes: { AssertionProofPurpose }
} = jsigs

const controller = 'https://example.edu/issuers/565049'
const keyPair = await Ed25519VerificationKey.from({
  type: 'Ed25519VerificationKey2020',
  controller,
  id: controller + '#z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T',
  publicKeyMultibase: 'z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T',
  privateKeyMultibase:
    'zrv2EET2WWZ8T1Jbg4fEH5cQxhbUS22XxdweypUbjWVzv1YD6VqYuW6LH7heQCNYQCuoKaDwvv2qCWz3uBzG2xesqmf'
})

// Provide a documentLoader that resolves the VC contexts, the key, and its
// controller. See test/node/documentLoader.ts for a securityLoader()-based one.
```

### `Ed25519Signature2020`

A class extending `DataIntegrityProof`. Pass `keyPair.signer()` directly -- the
constructor injects the required `algorithm` for you.

```js
import { Ed25519Signature2020 } from '@interop/ed25519-signature/ed25519-signature-2020'

const credential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    {
      AlumniCredential: 'https://schema.org#AlumniCredential',
      alumniOf: 'https://schema.org#alumniOf'
    },
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'http://example.edu/credentials/1872',
  type: ['VerifiableCredential', 'AlumniCredential'],
  issuer: controller,
  issuanceDate: '2010-01-01T19:23:24Z',
  credentialSubject: {
    id: 'https://example.edu/students/alice',
    alumniOf: 'Example University'
  }
}

const signed = await jsigs.sign(
  { ...credential },
  {
    suite: new Ed25519Signature2020({ signer: keyPair.signer() }),
    purpose: new AssertionProofPurpose(),
    documentLoader
  }
)
// signed.proof.type === 'Ed25519Signature2020'  (no `cryptosuite` field)

const result = await jsigs.verify(signed, {
  suite: new Ed25519Signature2020(),
  purpose: new AssertionProofPurpose(),
  documentLoader
})
// result.verified === true
```

### `eddsa-rdfc-2022`

A static cryptosuite object used with a bare `DataIntegrityProof`. On the sign
side, wrap the key with `createSigner` (see
[below](#the-createsigner-requirement)).

```js
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import { eddsaRdfc2022 } from '@interop/ed25519-signature/eddsa-rdfc-2022'
import { createSigner } from '@interop/ed25519-signature'

// The VC @context must include 'https://w3id.org/security/data-integrity/v2'.
const signed = await jsigs.sign(
  { ...diCredential },
  {
    suite: new DataIntegrityProof({
      cryptosuite: eddsaRdfc2022,
      signer: createSigner(keyPair)
    }),
    purpose: new AssertionProofPurpose(),
    documentLoader
  }
)
// signed.proof.type === 'DataIntegrityProof', signed.proof.cryptosuite === 'eddsa-rdfc-2022'

const result = await jsigs.verify(signed, {
  suite: new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 }),
  purpose: new AssertionProofPurpose(),
  documentLoader
})
```

### `eddsa-jcs-2022`

Split sign / verify factories (not a single object). The sign cryptosuite's
`createVerifier` throws, as a sign-only guard.

```js
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import {
  createSignCryptosuite,
  createVerifyCryptosuite
} from '@interop/ed25519-signature/eddsa-jcs-2022'
import { createSigner } from '@interop/ed25519-signature'

const signed = await jsigs.sign(
  { ...diCredential },
  {
    suite: new DataIntegrityProof({
      cryptosuite: createSignCryptosuite(),
      signer: createSigner(keyPair)
    }),
    purpose: new AssertionProofPurpose(),
    documentLoader
  }
)
// signed.proof.cryptosuite === 'eddsa-jcs-2022'

const result = await jsigs.verify(signed, {
  suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
  purpose: new AssertionProofPurpose(),
  documentLoader
})
```

JCS verification enforces the spec's context-prefix ordering check: the
document's `@context` must start with the proof's `@context`, in order.

### Verifying a mixed proof set

A single VC can carry one of each proof type in its `proof` array; pass all the
matching suites to one `jsigs.verify` call and they are disambiguated by
`matchProof`:

```js
const result = await jsigs.verify(signed, {
  suite: [
    new Ed25519Signature2020(),
    new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 }),
    new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() })
  ],
  purpose: new AssertionProofPurpose(),
  documentLoader
})
```

Note the proof-set semantics of `jsonld-signatures`: `result.verified` is `true`
if **any** matched proof verifies. Inspect `result.results` for the per-proof
outcome.

## API asymmetry across suites

The three suites expose deliberately different shapes, because the specs do --
a class (`Ed25519Signature2020`), a static cryptosuite object
(`eddsa-rdfc-2022`), and sign/verify factories (`eddsa-jcs-2022`). This is
intentional; don't try to abstract over it.

## The `createSigner` requirement

`DataIntegrityProof` asserts `signer.algorithm === 'Ed25519'` at construction.
In the Digital Bazaar ecosystem the key library supplies that property;
`@interop/ed25519-verification-key` does not (yet), so when using a **bare**
`DataIntegrityProof` (the rdfc / jcs suites) wrap the key with `createSigner`:

```js
import { createSigner } from '@interop/ed25519-signature'
new DataIntegrityProof({
  cryptosuite: eddsaRdfc2022,
  signer: createSigner(keyPair)
})
```

The `Ed25519Signature2020` class does this for you, so there you can pass
`keyPair.signer()` directly. `createSigner` is idempotent
(`algorithm ?? 'Ed25519'`), so it becomes a no-op once the key library sets
`algorithm` itself.

## Contribute

PRs accepted. See [`CLAUDE.md`](./CLAUDE.md) for toolchain, project layout, and
the testing rules (notably: never hand-roll JSON-LD `@context` documents in
tests).

## License

[New BSD License (3-clause)](LICENSE)
