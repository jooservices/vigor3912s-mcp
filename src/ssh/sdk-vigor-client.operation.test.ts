import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Transport } from '@jooservices/vigor3912s-sdk/transport';
import { FakeSshClient, FakeSshClientError } from '../test/fake-ssh-client.js';
import { SdkVigorClient } from './sdk-vigor-client.js';

vi.mock('@jooservices/ssh-client', () => ({
  SshClient: FakeSshClient,
  SshClientError: FakeSshClientError,
}));

function config(overrides: Record<string, unknown> = {}) {
  return {
    host: '192.168.1.1',
    port: 22,
    username: 'admin',
    password: 'secret',
    readOnly: false,
    sshHostFingerprint: 'SHA256:test',
    sshInsecureSkipHostVerify: false,
    ...overrides,
  };
}

afterEach(() => {
  FakeSshClient.instances = [];
  FakeSshClient.script = {};
  FakeSshClient.errors = {};
  FakeSshClient.connectError = null;
});

describe('SdkVigorClient.runOperation', () => {
  it('creates a fresh SDK session after an output limit failure', async () => {
    const transports: Array<{ transport: Transport; closeReasons: string[] }> = [];
    let sends = 0;
    const client = new SdkVigorClient(config(), () => {
      const state = { open: true, closeReasons: [] as string[] };
      const transport: Transport = {
        get isOpen() { return state.open; },
        async send(_frame, limits) {
          sends += 1;
          if (sends === 1) return { stdout: 'x'.repeat(limits.maxOutputBytes + 1), stderr: '' };
          return { stdout: 'Router Model: Vigor3912S Version: 4.4.7_RC2 English', stderr: '' };
        },
        async close(reason) { state.closeReasons.push(reason); state.open = false; },
      };
      transports.push({ transport, closeReasons: state.closeReasons });
      return transport;
    });

    await expect(client.runOperation('cli.sys.version', undefined)).rejects.toMatchObject({
      code: 'invalid',
      message: expect.stringContaining('narrow the query'),
    });
    expect(client.lastCommandTiming).toBeNull();
    await expect(client.runOperation('cli.sys.version', undefined)).resolves.toContain('4.4.7_RC2');
    expect(transports).toHaveLength(2);
    expect(transports[0]?.closeReasons).toContain('mcp_reset');
    expect(client.lastCommandTiming).toBeNull();
  });

  it('invokes a read TypedOperation with the typed input and returns formatted output', async () => {
    FakeSshClient.script['sys version'] =
      'Router Model: Vigor3912S    Version: 4.4.7_RC2 r5704 English\n';
    const client = new SdkVigorClient(config());
    await expect(client.runOperation('cli.sys.version', undefined)).resolves.toContain('Vigor3912S');
    expect(FakeSshClient.instances[0]?.written).toEqual(['sys version']);
  });

  it('refuses an unknown manifestId', async () => {
    const client = new SdkVigorClient(config());
    await expect(client.runOperation('cli.does.not.exist', undefined)).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('refuses a write-classified operation', async () => {
    const client = new SdkVigorClient(config());
    await expect(client.runOperation('cli.wan.disable', { wanInterface: 1 })).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('refuses a destructive-classified operation', async () => {
    const client = new SdkVigorClient(config());
    await expect(client.runOperation('cli.sys.cfg.default', undefined)).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('rejects after disconnect as closed', async () => {
    const client = new SdkVigorClient(config());
    await client.disconnect();
    await expect(client.runOperation('cli.sys.version', undefined)).rejects.toMatchObject({
      code: 'closed',
    });
  });

  it('refuses a read-classified operation through the write seam', async () => {
    const client = new SdkVigorClient(config());
    await expect(client.runWriteOperation('cli.sys.version', undefined)).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('does not echo typed secrets in an unauthorized error', async () => {
    const client = new SdkVigorClient(config());
    await expect(
      client.runWriteOperation('cli.sys.passwd', {
        oldPassword: 'old-secret-value',
        newPassword: 'new-secret-value',
      }),
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'write operation "cli.sys.passwd" was not confirmed and was refused',
    });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('maps a buildFrames failure (invalid typed input) through mapSdkError', async () => {
    const client = new SdkVigorClient(config());
    // Invalid IPv4 -> op.buildFrames throws before any transport call.
    await expect(
      client.runOperation('cli.ip.ping', { targetIp: 'not-an-ip' }),
    ).rejects.toMatchObject({ code: 'connect' });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('maps an SDK invoke failure through mapSdkError', async () => {
    FakeSshClient.errors['sys version'] = new FakeSshClientError('timeout', 'timed out');
    const client = new SdkVigorClient(config());
    await expect(client.runOperation('cli.sys.version', undefined)).rejects.toMatchObject({
      code: 'timeout',
    });
  });
});

describe('SdkVigorClient.runWriteOperation', () => {
  it('requires prior authorizeWrite bound to the exact rendered command, then invokes with typed input', async () => {
    FakeSshClient.script['wan disable WAN1'] = 'done';
    const client = new SdkVigorClient(config());
    await expect(
      client.runWriteOperation('cli.wan.disable', { wanInterface: 1 }),
    ).rejects.toMatchObject({ code: 'unauthorized' });

    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteOperation('cli.wan.disable', { wanInterface: 1 })).resolves.toBe(
      'done',
    );
    expect(FakeSshClient.instances[0]?.written).toEqual(['wan disable WAN1']);
  });

  it('is single-shot: authorization is consumed after one execution', async () => {
    FakeSshClient.script['wan disable WAN1'] = 'done';
    const client = new SdkVigorClient(config());
    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteOperation('cli.wan.disable', { wanInterface: 1 })).resolves.toBe(
      'done',
    );
    await expect(
      client.runWriteOperation('cli.wan.disable', { wanInterface: 1 }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('consumes authorization when the SDK invocation fails', async () => {
    FakeSshClient.errors['wan disable WAN1'] = new FakeSshClientError('timeout', 'timed out');
    const client = new SdkVigorClient(config());
    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteOperation('cli.wan.disable', { wanInterface: 1 })).rejects.toMatchObject({
      code: 'timeout',
    });
    await expect(client.runWriteOperation('cli.wan.disable', { wanInterface: 1 })).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('refuses in read-only mode even when authorized', async () => {
    const client = new SdkVigorClient(config({ readOnly: true }));
    client.authorizeWrite('wan disable WAN1');
    await expect(
      client.runWriteOperation('cli.wan.disable', { wanInterface: 1 }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('refuses a forbidden rendered frame even when authorized', async () => {
    const client = new SdkVigorClient(config());
    client.authorizeWrite('sys cfg default');
    await expect(client.runWriteOperation('cli.sys.cfg.default', undefined)).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(FakeSshClient.instances.flatMap((instance) => instance.written)).toEqual([]);
  });

  it('refuses an unknown manifestId', async () => {
    const client = new SdkVigorClient(config());
    await expect(
      client.runWriteOperation('cli.does.not.exist', undefined),
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('rejects an authorized write after disconnect as closed', async () => {
    FakeSshClient.script['wan disable WAN1'] = 'done';
    const client = new SdkVigorClient(config());
    client.authorizeWrite('wan disable WAN1');
    await client.disconnect();
    await expect(
      client.runWriteOperation('cli.wan.disable', { wanInterface: 1 }),
    ).rejects.toMatchObject({ code: 'closed' });
  });
});
