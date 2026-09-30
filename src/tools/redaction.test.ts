import { describe, expect, it } from 'vitest';
import { redactArgs, redactCommand } from './redaction.js';

describe('redaction', () => {
  it('redacts secret arg values from a rendered command', () => {
    const cmd = 'sys passwd oldSecret newSecret';
    expect(redactCommand(cmd, { old: 'oldSecret', new: 'newSecret' }, ['old', 'new'])).toBe(
      'sys passwd *** ***',
    );
  });

  it('redacts secret args in the args JSON', () => {
    const args = { wan: 1, password: 's3cret' };
    const out = JSON.parse(redactArgs(args, ['password']));
    expect(out.password).toBe('***');
    expect(out.wan).toBe(1);
  });

  it('does not touch non-secret args', () => {
    const out = JSON.parse(redactArgs({ wan: 2, name: 'WAN2' }, ['password']));
    expect(out.wan).toBe(2);
    expect(out.name).toBe('WAN2');
  });
});
