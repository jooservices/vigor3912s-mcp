import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fingerprintSha256, hostKeyMatches } from './host-key.js';

describe('host-key fingerprints', () => {
  const key = Buffer.from('vigor-test-host-key');

  it('formats OpenSSH-style SHA256 fingerprints', () => {
    const fp = fingerprintSha256(key);
    expect(fp.startsWith('SHA256:')).toBe(true);
    const raw = createHash('sha256').update(key).digest('base64').replace(/=+$/u, '');
    expect(fp).toBe(`SHA256:${raw}`);
  });

  it('matches OpenSSH and hex expected values', () => {
    const fp = fingerprintSha256(key);
    expect(hostKeyMatches(fp, key)).toBe(true);
    expect(hostKeyMatches(`sha256:${fp.slice(7)}`, key)).toBe(true);
    const hex = createHash('sha256').update(key).digest('hex');
    expect(hostKeyMatches(hex, key)).toBe(true);
    expect(hostKeyMatches('SHA256:not-the-key', key)).toBe(false);
  });
});
