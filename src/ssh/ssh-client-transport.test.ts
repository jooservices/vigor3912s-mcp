import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeSshClient, FakeSshClientError } from '../test/fake-ssh-client.js';
import { VigorCommandError } from './client.js';
import { SshClientTransport } from './ssh-client-transport.js';

vi.mock('@jooservices/ssh-client', () => ({
  SshClient: FakeSshClient,
  SshClientError: FakeSshClientError,
}));

afterEach(() => {
  FakeSshClient.instances = [];
  FakeSshClient.script = {};
  FakeSshClient.errors = {};
  FakeSshClient.connectError = null;
});

function makeTransport(overrides: Record<string, unknown> = {}) {
  return new SshClientTransport({
    host: '192.168.1.1',
    port: 22,
    username: 'admin',
    password: 'secret',
    sshHostFingerprint: 'SHA256:test',
    sshInsecureSkipHostVerify: false,
    ...overrides,
  });
}

describe('SshClientTransport', () => {
  it('rejects send after close', async () => {
    const transport = makeTransport();
    await transport.close('test');
    await expect(
      transport.send(
        { command: 'sys version' } as never,
        { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'closed', message: 'transport is closed' });
  });

  it('rejects ensureConnected after close', async () => {
    const transport = makeTransport();
    await transport.close('test');
    await expect(transport.ensureConnected()).rejects.toMatchObject({
      code: 'closed',
      message: 'transport is closed',
    });
  });

  it('clears timing after a failed send', async () => {
    FakeSshClient.script['sys version'] = 'ok';
    const transport = makeTransport();
    await transport.send(
      { command: 'sys version' } as never,
      { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
      new AbortController().signal,
    );
    expect(transport.lastCommandTiming).not.toBeNull();
    FakeSshClient.errors['sys version'] = new FakeSshClientError('timeout', 'slow');
    await expect(
      transport.send(
        { command: 'sys version' } as never,
        { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'timeout' });
    expect(transport.lastCommandTiming).toBeNull();
  });

  it('maps unknown Error on connect to connect', async () => {
    FakeSshClient.connectError = new Error('dns fail') as FakeSshClientError;
    await expect(makeTransport().ensureConnected()).rejects.toMatchObject({
      code: 'connect',
      message: 'dns fail',
    });
  });

  it('maps string connect failures', async () => {
    FakeSshClient.connectError = 'down' as unknown as FakeSshClientError;
    await expect(makeTransport().ensureConnected()).rejects.toMatchObject({
      code: 'connect',
      message: 'down',
    });
  });

  it.each(['connect', 'auth', 'timeout', 'closed', 'invalid'] as const)(
    'maps SshClientError %s on send',
    async (code) => {
      FakeSshClient.errors['sys version'] = new FakeSshClientError(code, `${code} fail`);
      await expect(
        makeTransport().send(
          { command: 'sys version' } as never,
          { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code, message: `${code} fail` });
    },
  );

  it('maps unknown SshClientError codes to connect', async () => {
    FakeSshClient.errors['sys version'] = new FakeSshClientError('invalid', 'x');
    // Force an unrecognized code past the typed constructor.
    (FakeSshClient.errors['sys version'] as { code: string }).code = 'weird';
    await expect(
      makeTransport().send(
        { command: 'sys version' } as never,
        { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'connect', message: 'x' });
  });

  it('passes through VigorCommandError from nested failures', async () => {
    FakeSshClient.errors['sys version'] = new VigorCommandError('invalid', 'already') as never;
    await expect(
      makeTransport().send(
        { command: 'sys version' } as never,
        { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'invalid', message: 'already' });
  });

  it('records timing on successful send', async () => {
    FakeSshClient.script['sys version'] = 'ok';
    const transport = makeTransport();
    const result = await transport.send(
      { command: 'sys version' } as never,
      { commandTimeoutMs: 1000, maxOutputBytes: 1000 } as never,
      new AbortController().signal,
    );
    expect(result.stdout).toBe('ok');
    expect(transport.lastCommandTiming).toMatchObject({
      sendAt: expect.any(Number),
      recvAt: expect.any(Number),
    });
    expect(transport.isOpen).toBe(true);
  });

  it('passes insecureSkipVerify to the ssh client', () => {
    makeTransport({ sshInsecureSkipHostVerify: true });
    expect(FakeSshClient.instances[0]?.options).toMatchObject({ insecureSkipVerify: true });
  });
});
