import { createHash, timingSafeEqual } from 'node:crypto';

/** OpenSSH-style SHA256 fingerprint (`SHA256:` + unpadded base64). */
export function fingerprintSha256(hostKey: Buffer): string {
  const b64 = createHash('sha256').update(hostKey).digest('base64').replace(/=+$/u, '');
  return `SHA256:${b64}`;
}

function normalizeFingerprint(value: string): string {
  const trimmed = value.trim();
  // Prefix is case-insensitive; base64 payload must keep original case.
  if (/^sha256:/iu.test(trimmed)) {
    return `SHA256:${trimmed.slice(trimmed.indexOf(':') + 1).replace(/=+$/u, '')}`;
  }
  // Accept raw hex SHA-256 (64 hex chars).
  if (/^[0-9a-f]{64}$/iu.test(trimmed)) {
    const b64 = Buffer.from(trimmed, 'hex').toString('base64').replace(/=+$/u, '');
    return `SHA256:${b64}`;
  }
  return trimmed;
}

/** Compare an expected fingerprint (OpenSSH SHA256 or hex) to a raw host key. */
export function hostKeyMatches(expectedFingerprint: string, hostKey: Buffer): boolean {
  const expected = Buffer.from(normalizeFingerprint(expectedFingerprint));
  const actual = Buffer.from(normalizeFingerprint(fingerprintSha256(hostKey)));
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
