import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildSignPayload,
  digestCommand,
  generateApproveKeyPair,
  publicKeyToConfigValue,
  parseApprovePublicKey,
  signApproval,
  verifyApprovalSignature,
} from './approve-crypto.js';

describe('approve-crypto', () => {
  it('parses valid Ed25519 public keys in PEM and base64 DER form', () => {
    const keys = generateApproveKeyPair();
    expect(parseApprovePublicKey(keys.publicKeyPem).asymmetricKeyType).toBe('ed25519');
    expect(parseApprovePublicKey(publicKeyToConfigValue(keys.publicKeyPem)).asymmetricKeyType).toBe('ed25519');
  });

  it('rejects malformed and non-Ed25519 public keys with a clear error', () => {
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rsaPem = rsa.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    expect(() => parseApprovePublicKey('not-a-key')).toThrow(
      'VIGOR_APPROVE_PUBKEY must be an Ed25519 public key (SPKI PEM or base64 DER)',
    );
    expect(() => parseApprovePublicKey(rsaPem)).toThrow(
      'VIGOR_APPROVE_PUBKEY must be an Ed25519 public key (SPKI PEM or base64 DER)',
    );
  });

  it('round-trips PEM and base64 public keys', () => {
    const keys = generateApproveKeyPair();
    const b64 = publicKeyToConfigValue(keys.publicKeyPem);
    const digest = digestCommand('wan disable WAN1');
    const payload = buildSignPayload('id1', 'nonce1', digest, 123);
    expect(payload.toString('utf8')).toContain('id1');
    const sig = signApproval(keys.privateKeyPem, 'id1', 'nonce1', digest, 123);
    expect(verifyApprovalSignature(b64, sig, 'id1', 'nonce1', digest, 123)).toBe(true);
    expect(verifyApprovalSignature(parseApprovePublicKey(b64), sig, 'id1', 'nonce1', digest, 123)).toBe(true);
    expect(verifyApprovalSignature(keys.publicKeyPem, sig, 'id1', 'nonce1', digest, 123)).toBe(true);
    expect(verifyApprovalSignature(b64, sig, 'id1', 'nonce1', digest, 999)).toBe(false);
    expect(verifyApprovalSignature(b64, '', 'id1', 'nonce1', digest, 123)).toBe(false);
    expect(verifyApprovalSignature('not-a-key', sig, 'id1', 'nonce1', digest, 123)).toBe(false);
  });
});
