import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';

/** Canonical bytes the human signs / MCP verifies. */
export function buildSignPayload(
  confirmationId: string,
  nonce: string,
  commandDigest: string,
  expiresAt: number,
): Buffer {
  return Buffer.from(`${confirmationId}\n${nonce}\n${commandDigest}\n${expiresAt}`, 'utf8');
}

export function digestCommand(command: string): string {
  return createHash('sha256').update(command, 'utf8').digest('hex');
}

export function generateApproveKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

function parsePublicKey(pemOrB64: string): KeyObject {
  const trimmed = pemOrB64.trim();
  if (trimmed.includes('BEGIN PUBLIC KEY')) {
    return createPublicKey(trimmed);
  }
  return createPublicKey({ key: Buffer.from(trimmed, 'base64'), format: 'der', type: 'spki' });
}

function parsePrivateKey(pem: string): KeyObject {
  return createPrivateKey(pem.trim());
}

export function publicKeyToConfigValue(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  return Buffer.from(key.export({ type: 'spki', format: 'der' })).toString('base64');
}

export function signApproval(
  privateKeyPem: string,
  confirmationId: string,
  nonce: string,
  commandDigest: string,
  expiresAt: number,
): string {
  const payload = buildSignPayload(confirmationId, nonce, commandDigest, expiresAt);
  const sig = sign(null, payload, parsePrivateKey(privateKeyPem));
  return sig.toString('base64');
}

export function verifyApprovalSignature(
  publicKeyPemOrB64: string,
  signatureB64: string,
  confirmationId: string,
  nonce: string,
  commandDigest: string,
  expiresAt: number,
): boolean {
  try {
    const payload = buildSignPayload(confirmationId, nonce, commandDigest, expiresAt);
    const signature = Buffer.from(signatureB64, 'base64');
    if (signature.length === 0) return false;
    return verify(null, payload, parsePublicKey(publicKeyPemOrB64), signature);
  } catch {
    return false;
  }
}
