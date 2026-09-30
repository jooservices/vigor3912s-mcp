import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { digestCommand } from './approve-crypto.js';
import { placeholder, redactArgs, redactCommand, restoreCommand, verifyReentry } from './redaction.js';

describe('redaction', () => {
  it('redacts secret arg values from a rendered command', () => {
    const cmd = 'sys passwd oldSecret newSecret';
    expect(redactCommand(cmd, { old: 'oldSecret', new: 'newSecret' }, ['old', 'new'])).toEqual({
      preview: 'sys passwd <redacted:old> <redacted:new>',
      fields: ['old', 'new'],
    });
  });

  it('redacts secret args in the args JSON', () => {
    const args = { wan: 1, password: randomBytes(16).toString('hex') };
    const out = JSON.parse(redactArgs(args, ['password']));
    expect(out.password).toBe('***');
    expect(out.wan).toBe(1);
  });

  it('does not touch non-secret args', () => {
    const out = JSON.parse(redactArgs({ wan: 2, name: 'WAN2' }, ['password']));
    expect(out.wan).toBe(2);
    expect(out.name).toBe('WAN2');
  });

  it('round-trips random secrets including overlapping values', () => {
    const short = randomBytes(8).toString('hex');
    const long = `${short}${randomBytes(8).toString('hex')}`;
    const other = randomBytes(16).toString('hex');
    const values = { first: short, nested: long, other };
    const command = `set ${long} ${short} ${other}`;
    const redacted = redactCommand(command, values, ['first', 'nested', 'other']);
    expect(redacted.fields[0]).toBe('nested');
    expect(new Set(redacted.fields)).toEqual(new Set(['nested', 'first', 'other']));
    expect(restoreCommand(redacted.preview, values)).toBe(command);
  });

  it('uses a named placeholder even when a secret matches a common token', () => {
    const redacted = redactCommand('wan set wan1 -p wan1', { param: 'wan1' }, ['param']);
    expect(redacted).toEqual({ preview: `wan set ${placeholder('param')} -p ${placeholder('param')}`, fields: ['param'] });
    expect(restoreCommand(redacted.preview, { param: 'wan1' })).toBe('wan set wan1 -p wan1');
  });

  it('does not redact inside placeholders created for another secret', () => {
    const redacted = redactCommand('set alpha secret', { secret: 'alpha', alpha: 'secret' }, ['secret', 'alpha']);
    expect(redacted.preview).toBe('set <redacted:secret> <redacted:alpha>');
    expect(restoreCommand(redacted.preview, { secret: 'alpha', alpha: 'secret' })).toBe('set alpha secret');
  });

  it('verifies re-entry against the pending command digest', () => {
    const preview = 'user set -w <redacted:param>';
    const view = {
      confirmationId: 'id', toolId: 'user_set', commandDigest: digestCommand('user set -w correct'),
      commandPreview: preview, redactedFields: ['param'], nonce: 'nonce', createdAt: 1, expiresAt: 2,
    };
    expect(verifyReentry(view, { param: 'correct' })).toBe(true);
    expect(verifyReentry(view, { param: 'wrong' })).toBe(false);
  });
});
