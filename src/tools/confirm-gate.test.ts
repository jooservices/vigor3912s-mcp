import { describe, expect, it } from 'vitest';
import { ConfirmError, ConfirmGate } from './confirm-gate.js';

describe('ConfirmGate', () => {
  it('creates a token bound to the exact command', () => {
    const gate = new ConfirmGate();
    const { token } = gate.create('wan_disable', 'wan disable WAN1');
    expect(token).toBeTypeOf('string');
    expect(token.length).toBeGreaterThan(20);
    expect(() => gate.validate(token, 'wan disable WAN1')).not.toThrow();
  });

  it('rejects an unknown token', () => {
    const gate = new ConfirmGate();
    expect(() => gate.validate('nope', 'sys commit')).toThrowError(
      new ConfirmError('invalid_token', 'confirmation token not found'),
    );
  });

  it('rejects a token used for a different command (mismatch)', () => {
    const gate = new ConfirmGate();
    const { token } = gate.create('wan_disable', 'wan disable WAN1');
    expect(() => gate.validate(token, 'wan disable WAN2')).toThrow(
      expect.objectContaining({ code: 'mismatch' }),
    );
  });

  it('is single-use', () => {
    const gate = new ConfirmGate();
    const { token } = gate.create('sys_commit', 'sys commit');
    gate.validate(token, 'sys commit');
    expect(() => gate.validate(token, 'sys commit')).toThrow(
      expect.objectContaining({ code: 'token_used' }),
    );
  });

  it('rejects an expired token', async () => {
    const gate = new ConfirmGate(20);
    const { token } = gate.create('sys_reboot', 'sys reboot');
    await new Promise((r) => setTimeout(r, 40));
    expect(() => gate.validate(token, 'sys reboot')).toThrow(
      expect.objectContaining({ code: 'token_expired' }),
    );
  });

  it('prunes expired intents', async () => {
    const gate = new ConfirmGate(20);
    gate.create('sys_reboot', 'sys reboot');
    expect(gate.size).toBe(1);
    await new Promise((r) => setTimeout(r, 40));
    gate.create('sys_commit', 'sys commit'); // create triggers prune
    expect(gate.size).toBe(1);
  });
});