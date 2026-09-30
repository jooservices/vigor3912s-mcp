import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { S } from './builders.js';

describe('S (SDK-backed command builder)', () => {
  it('derives kind from SDK classification and render from buildFrames', () => {
    const cmd = S('sys_version', 'sys', 'cli.sys.version', 'Router version');
    expect(cmd.kind).toBe('read');
    expect(cmd.render({})).toBe('sys version');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.version');
  });

  it('derives a write kind for write-classified operations and applies the default toInput', () => {
    const cmd = S('wan_disable_sdk', 'wan', 'cli.wan.disable', 'Disable a WAN interface', {
      args: { wanInterface: z.number() },
    });
    expect(cmd.kind).toBe('write');
    expect(cmd.render({ wanInterface: 1 })).toBe('wan disable WAN1');
  });

  it('applies a custom toInput when provided', () => {
    const cmd = S('wan_disable_custom', 'wan', 'cli.wan.disable', 'Disable a WAN interface', {
      args: { wan: z.number() },
      toInput: (args) => ({ wanInterface: args.wan }),
    });
    expect(cmd.render({ wan: 2 })).toBe('wan disable WAN2');
    expect(cmd.sdk?.toInput?.({ wan: 2 })).toEqual({ wanInterface: 2 });
  });

  it('throws at build time for an unknown manifestId', () => {
    expect(() => S('bogus', 'sys', 'cli.does.not.exist', 'desc')).toThrow(/unknown SDK manifestId/);
  });

  it('derives args from the SDK input schema when opts.args is omitted', () => {
    const cmd = S('wan_disable_derived', 'wan', 'cli.wan.disable', 'Disable a WAN interface');
    expect(Object.keys(cmd.args)).toEqual(['wanInterface']);
    expect(cmd.render({ wanInterface: 3 })).toBe('wan disable WAN3');
  });

  it('attaches a default validate that accepts a schema-valid mapped input', () => {
    const cmd = S('apm_apsyslog_sdk', 'apm', 'cli.apm.apsyslog', 'AP syslog', {
      args: { apIndex: z.number() },
    });
    expect(cmd.sdk?.validate?.({ apIndex: 1 })).toEqual({ apIndex: 1 });
  });

  it('attaches a default validate that throws VigorCommandError on a schema-invalid mapped input', () => {
    const cmd = S('apm_apsyslog_sdk_bad', 'apm', 'cli.apm.apsyslog', 'AP syslog', {
      args: { apIndex: z.number() },
    });
    expect(() => cmd.sdk?.validate?.({ apIndex: 'not-a-number' })).toThrow(/invalid input for SDK operation/);
  });

  it('a caller-supplied validate overrides the default', () => {
    const cmd = S('apm_apsyslog_sdk_override', 'apm', 'cli.apm.apsyslog', 'AP syslog', {
      args: { apIndex: z.number() },
      validate: (input) => ({ ...(input as Record<string, unknown>), overridden: true }),
    });
    expect(cmd.sdk?.validate?.({ apIndex: 1 })).toEqual({ apIndex: 1, overridden: true });
  });

  it('wraps a non-object top-level schema: default toInput unwraps args.input, args exposes a single "input" key', () => {
    const cmd = S('sys_autoreboot_sdk', 'sys', 'cli.sys.autoreboot', 'Auto-reboot schedule');
    expect(Object.keys(cmd.args)).toEqual(['input']);
    expect(cmd.sdk?.toInput?.({ input: 'on' })).toBe('on');
    expect(cmd.sdk?.validate?.('on')).toBe('on');
    expect(() => cmd.sdk?.validate?.('bogus')).toThrow(/invalid input for SDK operation/);
  });
});
