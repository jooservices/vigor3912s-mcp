import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeSshClient, FakeSshClientError } from '../test/fake-ssh-client.js';
import { SdkVigorClient, VigorCommandError } from './sdk-vigor-client.js';

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

describe('SdkVigorClient', () => {
  it('passes connection and host-key settings to the transport', () => {
    new SdkVigorClient(config());
    expect(FakeSshClient.instances[0]?.options).toMatchObject({
      host: '192.168.1.1',
      port: 22,
      username: 'admin',
      password: 'secret',
      hostFingerprint: 'SHA256:test',
    });
    expect(FakeSshClient.instances[0]?.options).not.toHaveProperty('insecureSkipVerify');
  });

  it('passes insecureSkipVerify when host verify is skipped', () => {
    new SdkVigorClient(config({ sshInsecureSkipHostVerify: true }));
    expect(FakeSshClient.instances[0]?.options).toMatchObject({
      insecureSkipVerify: true,
    });
    expect(FakeSshClient.instances[0]?.options).not.toHaveProperty('hostFingerprint');
  });

  it('runs registered reads through the SDK and records timing', async () => {
    FakeSshClient.script['sys version'] =
      'Router Model: Vigor3912S    Version: 4.4.7_RC2 r5704 English\n';
    const client = new SdkVigorClient(config());
    await expect(client.runCommand('sys version')).resolves.toContain('Vigor3912S');
    expect(client.lastCommandTiming).toMatchObject({
      sendAt: expect.any(Number),
      recvAt: expect.any(Number),
      connectMs: expect.any(Number),
    });
  });

  it('rejects non-allowlisted reads before transport execution', async () => {
    const client = new SdkVigorClient(config());
    await expect(client.runCommand('show status && reboot')).rejects.toMatchObject({
      code: 'invalid',
    });
    expect(FakeSshClient.instances[0]?.written).toEqual([]);
  });

  it.each(['sys cfg default', 'sys halt', 'mngt rmtcfg enable', 'linux clean -w'])(
    'hard-blocks %s on both paths',
    async (command) => {
      const client = new SdkVigorClient(config());
      await expect(client.runCommand(command)).rejects.toMatchObject({ code: 'invalid' });
      client.authorizeWrite(command);
      await expect(client.runWriteCommand(command)).rejects.toMatchObject({ code: 'invalid' });
      expect(FakeSshClient.instances[0]?.written).toEqual([]);
    },
  );

  it('consumes write authorization after one execution', async () => {
    FakeSshClient.script['wan disable WAN1'] = 'done';
    const client = new SdkVigorClient(config());
    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteCommand('wan disable WAN1')).resolves.toBe('done');
    await expect(client.runWriteCommand('wan disable WAN1')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('refuses writes in read-only mode', async () => {
    const client = new SdkVigorClient(config({ readOnly: true }));
    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteCommand('wan disable WAN1')).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(FakeSshClient.instances[0]?.written).toEqual([]);
  });

  it.each(['connect', 'auth', 'timeout', 'closed', 'invalid'] as const)(
    'maps transport %s errors',
    async (code) => {
      FakeSshClient.errors['sys version'] = new FakeSshClientError(code, `${code} failure`);
      const client = new SdkVigorClient(config());
      await expect(client.runCommand('sys version')).rejects.toMatchObject({
        name: 'VigorCommandError',
        code,
        message: `${code} failure`,
      });
    },
  );

  it('maps unknown connection errors and remains closed after disconnect', async () => {
    FakeSshClient.connectError = new FakeSshClientError('connect', 'network unavailable');
    const client = new SdkVigorClient(config());
    await expect(client.connect()).rejects.toMatchObject({ code: 'connect' });
    FakeSshClient.connectError = null;
    await client.disconnect();
    await expect(client.runCommand('sys version')).rejects.toMatchObject({ code: 'closed' });
  });

  it('maps SDK framing rejection on write to invalid', async () => {
    const client = new SdkVigorClient(config());
    client.authorizeWrite('sys name wan1 x; reboot');
    await expect(client.runWriteCommand('sys name wan1 x; reboot')).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('maps unknown non-Ssh errors to connect', async () => {
    FakeSshClient.errors['sys version'] = new Error('boom') as FakeSshClientError;
    const client = new SdkVigorClient(config());
    await expect(client.runCommand('sys version')).rejects.toMatchObject({
      code: 'connect',
      message: 'boom',
    });
  });

  it('rejects runCommand after disconnect without transport send', async () => {
    const client = new SdkVigorClient(config());
    await client.disconnect();
    await expect(client.runCommand('sys version')).rejects.toMatchObject({ code: 'closed' });
  });

  it('rejects unauthorized write before disconnect check', async () => {
    const client = new SdkVigorClient(config());
    await expect(client.runWriteCommand('sys name wan1 x')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('rejects authorized write after disconnect as closed', async () => {
    FakeSshClient.script['sys name wan1 R1'] = 'done';
    const client = new SdkVigorClient(config());
    client.authorizeWrite('sys name wan1 R1');
    await client.disconnect();
    await expect(client.runWriteCommand('sys name wan1 R1')).rejects.toMatchObject({ code: 'closed' });
  });

  it('formats invoke results that expose a raw string field', async () => {
    // `sys commit` is a void write op — authorize then run; parser may return ack/raw.
    FakeSshClient.script['sys commit'] = 'Configuration is saved.';
    const client = new SdkVigorClient(config());
    client.authorizeWrite('sys commit');
    const out = await client.runWriteCommand('sys commit');
    expect(out.length).toBeGreaterThan(0);
  });
});
