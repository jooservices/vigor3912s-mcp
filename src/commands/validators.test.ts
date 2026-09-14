import { describe, expect, it } from 'vitest';
import {
  ipv4,
  ipv4Mask,
  ipv6,
  macColon,
  macDash,
  noControl,
  safeText,
} from './validators.js';

describe('ipv4 / ipv4Mask', () => {
  it('accepts a normal address and netmask', () => {
    expect(ipv4.safeParse('192.168.1.1').success).toBe(true);
    expect(ipv4Mask.safeParse('255.255.255.0').success).toBe(true);
  });

  it('rejects CLI injection payloads that the old /^255./ mask regex allowed', () => {
    for (const bad of [
      '255.255.255.0\nsys reboot',
      '255.255.255.0;sys reboot',
      '255.255.255.0 wan disable WAN1',
      '255.evil',
    ]) {
      expect(ipv4Mask.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('ipv6', () => {
  it('accepts a valid address and rejects garbage', () => {
    expect(ipv6.safeParse('2001:4860:4860::8888').success).toBe(true);
    expect(ipv6.safeParse('not-an-ip').success).toBe(false);
  });
});

describe('macDash / macColon', () => {
  it('enforces the separator each DrayOS command expects', () => {
    expect(macDash.safeParse('AA-BB-CC-DD-EE-FF').success).toBe(true);
    expect(macDash.safeParse('AA:BB:CC:DD:EE:FF').success).toBe(false);
    expect(macColon.safeParse('AA:BB:CC:DD:EE:FF').success).toBe(true);
    expect(macColon.safeParse('AA-BB-CC-DD-EE-FF').success).toBe(false);
  });
});

describe('noControl', () => {
  it('rejects CR/LF but allows password metacharacters', () => {
    expect(noControl().safeParse('p@ss;|&`$').success).toBe(true);
    expect(noControl().safeParse('old\nnew').success).toBe(false);
    expect(noControl().safeParse('old\rwan disable').success).toBe(false);
  });
});

describe('safeText', () => {
  it('rejects control chars and shell metacharacters', () => {
    expect(safeText().safeParse('limit bandwidth 1000').success).toBe(true);
    for (const bad of ['x; reboot', 'x & reboot', 'x`reboot`', 'x$reboot', 'a\nb']) {
      expect(safeText().safeParse(bad).success, bad).toBe(false);
    }
  });
});
