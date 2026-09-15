import { describe, expect, it } from 'vitest';
import { generateApproveKeyPair, publicKeyToConfigValue } from './tools/approve-crypto.js';
import { loadConfig, parseEnvBool } from './config.js';

describe('parseEnvBool', () => {
  it('accepts yes/on as true (fail-closed on unknown)', () => {
    expect(parseEnvBool('X', 'yes', false)).toBe(true);
    expect(parseEnvBool('X', 'on', false)).toBe(true);
    expect(parseEnvBool('X', 'no', true)).toBe(false);
    expect(() => parseEnvBool('X', 'maybe', false)).toThrow(/Invalid boolean/);
  });
});

describe('loadConfig', () => {
  const keys = generateApproveKeyPair();
  const pub = publicKeyToConfigValue(keys.publicKeyPem);

  function base(env: Record<string, string | undefined> = {}) {
    return loadConfig({
      VIGOR_PASSWORD: 'secret',
      VIGOR_SSH_INSECURE_SKIP_VERIFY: 'true',
      VIGOR_APPROVE_PUBKEY: pub,
      ...env,
    });
  }

  it('parses VIGOR_READ_ONLY=yes as true', () => {
    expect(base({ VIGOR_READ_ONLY: 'yes' }).readOnly).toBe(true);
  });

  it('parses auto-commit off and expose/disabled lists', () => {
    const cfg = base({
      VIGOR_AUTO_COMMIT: 'no',
      VIGOR_HOST: '10.0.0.1',
      VIGOR_PORT: '2222',
      VIGOR_USER: 'ops',
      VIGOR_LOG_DB: 'data/x.db',
      EXPOSE_TOOLS: 'readonly',
      VIGOR_DISABLED_TOOLS: 'sys_reboot,sys_halt',
      VIGOR_TOOL_OUTPUT_LIMIT: '100',
    });
    expect(cfg.autoCommit).toBe(false);
    expect(cfg.host).toBe('10.0.0.1');
    expect(cfg.port).toBe(2222);
    expect(cfg.exposeTools.length).toBeGreaterThan(0);
    expect(cfg.disabledTools).toEqual(['sys_reboot', 'sys_halt']);
    expect(cfg.toolOutputLimit).toBe(100);
  });

  it('accepts EXPOSE_TOOLS=all', () => {
    expect(base({ EXPOSE_TOOLS: 'all' }).exposeTools).toEqual([]);
  });

  it('accepts an explicit EXPOSE_TOOLS id list', () => {
    expect(base({ EXPOSE_TOOLS: 'wan_status, show_status' }).exposeTools).toEqual([
      'wan_status',
      'show_status',
    ]);
  });

  it('rejects schema-invalid config', () => {
    expect(() => base({ VIGOR_PORT: 'not-a-number' })).toThrow(/Invalid VIGOR_/);
  });

  it('requires approve pubkey when not read-only', () => {
    expect(() =>
      loadConfig({
        VIGOR_PASSWORD: 'secret',
        VIGOR_SSH_INSECURE_SKIP_VERIFY: 'true',
      }),
    ).toThrow(/VIGOR_APPROVE_PUBKEY/);
  });

  it('allows missing approve pubkey in read-only mode', () => {
    const cfg = loadConfig({
      VIGOR_PASSWORD: 'secret',
      VIGOR_SSH_INSECURE_SKIP_VERIFY: 'true',
      VIGOR_READ_ONLY: 'true',
    });
    expect(cfg.readOnly).toBe(true);
  });

  it('requires host fingerprint unless insecure skip is set', () => {
    expect(() =>
      loadConfig({
        VIGOR_PASSWORD: 'secret',
        VIGOR_APPROVE_PUBKEY: pub,
      }),
    ).toThrow(/VIGOR_SSH_HOST_FINGERPRINT/);
  });

  it('rejects invalid boolean env values', () => {
    expect(() => base({ VIGOR_READ_ONLY: 'maybe' })).toThrow(/Invalid boolean/);
  });
});
