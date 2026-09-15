import { describe, expect, it } from 'vitest';
import {
  generateApproveKeyPair,
  publicKeyToConfigValue,
  signApproval,
} from './approve-crypto.js';
import { ConfirmError, ConfirmGate } from './confirm-gate.js';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('ConfirmGate (signed approval)', () => {
  const keys = generateApproveKeyPair();
  const pub = publicKeyToConfigValue(keys.publicKeyPem);

  function signCreated(
    gate: ConfirmGate,
    toolId: string,
    command: string,
  ): { confirmationId: string; signature: string } {
    const created = gate.create(toolId, command, command);
    const signature = signApproval(
      keys.privateKeyPem,
      created.confirmationId,
      created.nonce,
      created.commandDigest,
      created.expiresAt,
    );
    return { confirmationId: created.confirmationId, signature };
  }

  it('consumes a valid signature bound to the exact command', () => {
    const gate = new ConfirmGate(60_000, 100, undefined, pub);
    const { confirmationId, signature } = signCreated(gate, 'wan_disable', 'wan disable WAN1');
    expect(() => gate.consumeSigned(confirmationId, 'wan disable WAN1', signature)).not.toThrow();
  });

  it('rejects an unknown confirmation id', () => {
    const gate = new ConfirmGate(60_000, 100, undefined, pub);
    expect(() => gate.consumeSigned('nope', 'sys commit', 'aaaa')).toThrowError(
      expect.objectContaining({ code: 'invalid_token' }),
    );
  });

  it('rejects a signature used for a different command (mismatch)', () => {
    const gate = new ConfirmGate(60_000, 100, undefined, pub);
    const { confirmationId, signature } = signCreated(gate, 'wan_disable', 'wan disable WAN1');
    expect(() => gate.consumeSigned(confirmationId, 'wan disable WAN2', signature)).toThrow(
      expect.objectContaining({ code: 'mismatch' }),
    );
  });

  it('rejects a forged signature', () => {
    const gate = new ConfirmGate(60_000, 100, undefined, pub);
    const created = gate.create('sys_commit', 'sys commit', 'sys commit');
    expect(() =>
      gate.consumeSigned(created.confirmationId, 'sys commit', Buffer.alloc(64).toString('base64')),
    ).toThrow(expect.objectContaining({ code: 'bad_signature' }));
  });

  it('is single-use', () => {
    const gate = new ConfirmGate(60_000, 100, undefined, pub);
    const { confirmationId, signature } = signCreated(gate, 'sys_commit', 'sys commit');
    gate.consumeSigned(confirmationId, 'sys commit', signature);
    expect(() => gate.consumeSigned(confirmationId, 'sys commit', signature)).toThrow(
      expect.objectContaining({ code: 'token_used' }),
    );
  });

  it('rejects an expired confirmation', async () => {
    const gate = new ConfirmGate(20, 100, undefined, pub);
    const { confirmationId, signature } = signCreated(gate, 'sys_reboot', 'sys reboot');
    await new Promise((r) => setTimeout(r, 40));
    expect(() => gate.consumeSigned(confirmationId, 'sys reboot', signature)).toThrow(
      expect.objectContaining({ code: 'token_expired' }),
    );
  });

  it('persists redacted pending views with mode 0600', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vigor-pending-'));
    const file = path.join(dir, 'pending-confirms.json');
    try {
      const gate = new ConfirmGate(60_000, 100, file, pub);
      gate.create('sys_passwd', 'sys passwd secret oldnew', 'sys passwd *** ***');
      const raw = readFileSync(file, 'utf8');
      expect(raw).not.toContain('secret');
      expect(raw).toContain('sys passwd *** ***');
      expect(statSync(file).mode & 0o777).toBe(0o600);
      const loaded = ConfirmGate.loadPending(file);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]?.commandPreview).toBe('sys passwd *** ***');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('requires approve public key to consume', () => {
    const gate = new ConfirmGate();
    const created = gate.create('sys_commit', 'sys commit', 'sys commit');
    expect(() => gate.consumeSigned(created.confirmationId, 'sys commit', 'x')).toThrow(
      new ConfirmError('bad_signature', 'VIGOR_APPROVE_PUBKEY is not configured'),
    );
  });

  it('rejects when too many intents are pending', () => {
    const gate = new ConfirmGate(60_000, 1, undefined, pub);
    gate.create('a', 'cmd a', 'cmd a');
    expect(() => gate.create('b', 'cmd b', 'cmd b')).toThrow(/too many pending/);
  });

  it('loadPending ignores corrupt files and non-arrays', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'vigor-pending-bad-'));
    const file = path.join(dir, 'pending.json');
    try {
      expect(ConfirmGate.loadPending(path.join(dir, 'missing.json'))).toEqual([]);
      writeFileSync(file, '{');
      expect(ConfirmGate.loadPending(file)).toEqual([]);
      writeFileSync(file, '{"no":"array"}');
      expect(ConfirmGate.loadPending(file)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
