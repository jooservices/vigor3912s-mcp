import { describe, expect, it } from 'vitest';
import { isAllowedReadCommand } from './read-allowlist.js';
import { readCommands } from './registry/index.js';

describe('isAllowedReadCommand', () => {
  it('allows every no-arg registry read plus session controls', () => {
    expect(isAllowedReadCommand('')).toBe(true);
    expect(isAllowedReadCommand('exit')).toBe(true);
    for (const cmd of readCommands().filter((c) => Object.keys(c.args).length === 0)) {
      expect(isAllowedReadCommand(cmd.render({})), cmd.id).toBe(true);
    }
  });

  it('allows parameterized reads only with hosts that pass registry Zod schemas', () => {
    expect(isAllowedReadCommand('ip ping 8.8.8.8')).toBe(true);
    expect(isAllowedReadCommand('ip tracert 1.1.1.1')).toBe(true);
    expect(isAllowedReadCommand('ip6 ping 2001:4860:4860::8888')).toBe(true);
    expect(isAllowedReadCommand('ip6 tracert ::1')).toBe(true);
  });

  it('rejects writes, injection, and hosts that Zod would reject', () => {
    for (const bad of [
      'sys commit',
      'wan disable WAN1',
      'show status && reboot',
      'ip ping 8.8.8.8 -c 5',
      'ip ping; reboot',
      'ip ping a.b.c.d',
      'ip6 ping not-an-ip',
      'ip6 ping 2001:db8::1 extra',
      'ip6 ping 2001:db8::1%evil',
    ]) {
      expect(isAllowedReadCommand(bad), bad).toBe(false);
    }
  });
});
