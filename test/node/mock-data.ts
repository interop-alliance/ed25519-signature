export const controller = 'https://example.edu/issuers/565049'

export const mockPublicKey2020 = {
  '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
  type: 'Ed25519VerificationKey2020',
  controller,
  id: controller + '#z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T',
  publicKeyMultibase: 'z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T'
}

export const mockKeyPair2020 = {
  type: 'Ed25519VerificationKey2020',
  controller,
  id: controller + '#z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T',
  publicKeyMultibase: 'z6MknCCLeeHBUaHu4aHSVLDCYQW9gjVJ7a63FpMvtuVMy53T',
  privateKeyMultibase:
    'zrv2EET2WWZ8T1Jbg4fEH5cQxhbUS22XxdweypUbjWVzv1YD6VqYuW6LH7heQCNYQCuoKaDwvv2qCWz3uBzG2xesqmf'
}

export const controllerDoc2020 = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: controller,
  assertionMethod: [mockPublicKey2020]
}

export const credential = {
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

// Test vectors from the vc-di-eddsa spec (commit 2d1337b)
export const specKeyMaterial = {
  publicKeyMultibase: 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
  secretKeyMultibase: 'z3u2en7t5LR2WtQH5PfFqMqwVHBeXouLzo6haApm8XHqvjxq'
}

export const specPublicKey = {
  '@context': 'https://w3id.org/security/multikey/v1',
  id: 'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2#z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
  type: 'Multikey',
  controller:
    'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
  publicKeyMultibase: 'z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2'
}

export const specControllerDoc = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/multikey/v1'
  ],
  id: specPublicKey.controller,
  assertionMethod: [specPublicKey]
}

export const specSignedFixture = {
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://www.w3.org/ns/credentials/examples/v2',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:uuid:58172aac-d8ba-11ed-83dd-0b3aef56cc33',
  type: ['VerifiableCredential', 'AlumniCredential'],
  name: 'Alumni Credential',
  description: 'A minimum viable example of an Alumni Credential.',
  issuer: 'https://vc.example/issuers/5678',
  validFrom: '2023-01-01T00:00:00Z',
  credentialSubject: {
    id: 'did:example:abcdefgh',
    alumniOf: 'The School of Examples'
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2023-02-24T23:36:38Z',
    verificationMethod:
      'did:key:z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2#z6MkrJVnaZkeFzdQyMZu1cgjg7k1pZZ6pvBQ7XJPt4swbTQ2',
    proofPurpose: 'assertionMethod',
    proofValue:
      'z57Mm1vboMtZiCyJ4aReZsv8co4Re64Y8GEjL1ZARzMbXZgkARFLqFs1P345NpPGG2hgCrS4nNdvJhpwnrNyG3kEF'
  }
}
