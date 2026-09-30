import { describe, expect, it } from 'vitest';
import { isForbidden } from './forbidden.js';

describe('isForbidden', () => {
  it.each([
    'sys  halt',
    'SYS HALT',
    ' sys halt ',
    'sys halt now',
    'mngt rmtcfg enable x',
    'sys name x\nsys cfg default',
    'linux clean -w',
  ])('rejects normalized forbidden command %j', (command) => {
    expect(isForbidden(command)).toBe(true);
  });

  it.each(['sys name x', 'sys haltx', 'linux cleaner', 'mngt rmtcfg enablex'])(
    'allows command outside forbidden word boundaries %j',
    (command) => {
      expect(isForbidden(command)).toBe(false);
    },
  );
});
