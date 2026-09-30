import { describe, expect, it } from 'vitest';
import { SshClientTransport } from './ssh-client-transport.js';

describe('SSH host-key configuration', () => {
  it('rejects an invalid fingerprint when the transport is created', () => {
    expect(
      () =>
        new SshClientTransport({
          host: '192.168.1.1',
          port: 22,
          username: 'admin',
          password: 'unused',
          sshHostFingerprint: 'invalid-fingerprint',
          sshInsecureSkipHostVerify: false,
        }),
    ).toThrow();
  });
});
