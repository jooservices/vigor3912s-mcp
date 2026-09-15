import { describe, expect, it } from 'vitest';
import {
  buildSignPayload,
  digestCommand,
  generateApproveKeyPair,
  publicKeyToConfigValue,
  signApproval,
  verifyApprovalSignature,
} from './approve-crypto.js';

describe('approve-crypto', () => {
  it('round-trips PEM and base64 public keys', () => {
    const keys = generateApproveKeyPair();
    const b64 = publicKeyToConfigValue(keys.publicKeyPem);
    const digest = digestCommand('wan disable WAN1');
    const payload = buildSignPayload('id1', 'nonce1', digest, 123);
    expect(payload.toString('utf8')).toContain('id1');
    const sig = signApproval(keys.privateKeyPem, 'id1', 'nonce1', digest, 123);
    expect(verifyApprovalSignature(b64, sig, 'id1', 'nonce1', digest, 123)).toBe(true);
    expect(verifyApprovalSignature(keys.publicKeyPem, sig, 'id1', 'nonce1', digest, 123)).toBe(true);
    expect(verifyApprovalSignature(b64, sig, 'id1', 'nonce1', digest, 999)).toBe(false);
    expect(verifyApprovalSignature(b64, '', 'id1', 'nonce1', digest, 123)).toBe(false);
    expect(verifyApprovalSignature('not-a-key', sig, 'id1', 'nonce1', digest, 123)).toBe(false);
  });
});
