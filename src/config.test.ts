import { afterAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { generateApproveKeyPair, publicKeyToConfigValue } from './tools/approve-crypto.js';
import { loadConfig, parseEnvBool } from './config.js';
import path from 'node:path';
import { PACKAGE_ROOT } from './paths.js';
import { readCommands } from './commands/registry/index.js';

afterAll(() => {
  expect(existsSync(path.join(PACKAGE_ROOT, 'pending-confirms.json'))).toBe(false);
});

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
    expect(cfg.exposeTools).toEqual({ mode: 'list', ids: readCommands().map((command) => command.id) });
    expect(cfg.disabledTools).toEqual(['sys_reboot', 'sys_halt']);
    expect(cfg.toolOutputLimit).toBe(100);
    expect(cfg.logDb).toBe(path.join(PACKAGE_ROOT, 'data/x.db'));
    expect(cfg.pendingFile).toBe(path.join(PACKAGE_ROOT, 'data/pending-confirms.json'));
  });

  it('uses the package root for relative log and pending paths', () => {
    const cfg = base({ VIGOR_LOG_DB: 'data/logs/custom.db', VIGOR_PENDING_FILE: 'custom/pending.json' });
    expect(cfg.logDb).toBe(path.join(PACKAGE_ROOT, 'data/logs/custom.db'));
    expect(cfg.pendingFile).toBe(path.join(PACKAGE_ROOT, 'custom/pending.json'));
  });

  it('disables pending storage when the log database is in memory', () => {
    const cfg = base({ VIGOR_LOG_DB: ':memory:', VIGOR_PENDING_FILE: 'custom/pending.json' });
    expect(cfg.logDb).toBe(':memory:');
    expect(cfg.pendingFile).toBeUndefined();
  });

  it('exposes only read tools when EXPOSE_TOOLS is unset or empty', () => {
    const expected = { mode: 'list', ids: readCommands().map((command) => command.id) };
    expect(base().exposeTools).toEqual(expected);
    expect(base({ EXPOSE_TOOLS: '' }).exposeTools).toEqual(expected);
  });

  it('requires EXPOSE_TOOLS=all to expose every tool', () => {
    expect(base({ EXPOSE_TOOLS: 'all' }).exposeTools).toEqual({ mode: 'all' });
  });

  it('accepts an explicit EXPOSE_TOOLS id list', () => {
    expect(base({ EXPOSE_TOOLS: 'wan_status, show_status' }).exposeTools).toEqual({
      mode: 'list',
      ids: ['wan_status', 'show_status'],
    });
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

  it('rejects an invalid approval key during config loading', () => {
    expect(() => base({ VIGOR_APPROVE_PUBKEY: 'not-a-key' })).toThrow(
      'VIGOR_APPROVE_PUBKEY must be an Ed25519 public key (SPKI PEM or base64 DER)',
    );
  });

  it('accepts a valid PEM approval key', () => {
    expect(base({ VIGOR_APPROVE_PUBKEY: keys.publicKeyPem }).approvePublicKey).toHaveProperty(
      'asymmetricKeyType',
      'ed25519',
    );
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
