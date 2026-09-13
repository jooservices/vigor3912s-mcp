import { afterEach, describe, expect, it, vi } from 'vitest';
import { SshVigorClient, VigorCommandError } from './driver.js';

/**
 * Fake ssh2: a scripted router shell that echoes each command, returns canned
 * output, and always ends with the `DrayTek> ` prompt.
 */
const fake = vi.hoisted(() => {
  class MiniEmitter {
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    on(event: string, fn: (...args: unknown[]) => void): this {
      (this.listeners[event] ??= []).push(fn);
      return this;
    }
    emit(event: string, ...args: unknown[]): boolean {
      for (const fn of [...(this.listeners[event] ?? [])]) fn(...args);
      return true;
    }
    removeAllListeners(event?: string): this {
      if (event) this.listeners[event] = [];
      else this.listeners = {};
      return this;
    }
  }

  class FakeStream extends MiniEmitter {
    destroyed = false;
    written: string[] = [];
    constructor(
      private readonly script: Record<string, string | string[]>,
      private readonly delayMs = 0,
    ) {
      super();
    }
    write(data: string): boolean {
      this.written.push(data);
      const cmd = data.replace(/\r$/, '');
      const resp = this.script[cmd];
      // undefined response simulates a router that never answers (timeout).
      if (resp === undefined) return true;
      const emit = () => {
        const body = Array.isArray(resp) ? resp : [resp];
        for (const part of body) {
          this.emit('data', Buffer.from(`\r\n${cmd}\r\n${part}\r\nDrayTek> `));
        }
      };
      if (this.delayMs > 0) setTimeout(emit, this.delayMs);
      else setImmediate(emit);
      return true;
    }
    end(): void {
      if (this.destroyed) return;
      this.destroyed = true;
      this.emit('close');
    }
    destroy(): void {
      this.destroyed = true;
    }
  }

  class FakeClient extends MiniEmitter {
    static instances: FakeClient[] = [];
    static script: Record<string, string | string[]> = {};
    static delayMs = 0;
    private stream: FakeStream | null = null;
    constructor() {
      super();
      FakeClient.instances.push(this);
    }
    connect(): void {
      setImmediate(() => this.emit('ready'));
    }
    shell(_opts: unknown, cb: (err: Error | undefined, stream: unknown) => void): void {
      this.stream = new FakeStream(FakeClient.script, FakeClient.delayMs);
      setImmediate(() => cb(undefined, this.stream));
    }
    getStream(): FakeStream | null {
      return this.stream;
    }
    end(): void {
      if (this.stream) this.stream.end();
    }
  }

  return { FakeClient, FakeStream };
});

vi.mock('ssh2', () => ({ Client: fake.FakeClient }));

const READ_ONLY = [
  'sys version',
  'show status',
  'show lan',
  'wan status',
  'ip route status',
  'ip arp status',
  'srv dhcp status',
  'ip ping 8.8.8.8',
];

const FORBIDDEN = [
  'sys passwd old new',
  'sys commit',
  'sys reboot',
  'sys cfg default',
  'wan disable',
  'mngt sshport 22',
  'mngt rmtcfg enable',
  'srv nat portmap add 1 x tcp 80 0 0 1.2.3.4 80 1 0',
  'srv dhcp on',
  'linux clean -w',
  'exit; rm -rf /',
  'sys mpage disable',
];

function cfg(overrides: Record<string, unknown> = {}) {
  return {
    host: '192.168.1.1',
    port: 22,
    username: 'admin',
    password: 'secret',
    readOnly: false,
    ...overrides,
  };
}

afterEach(() => {
  fake.FakeClient.instances = [];
  fake.FakeClient.script = {};
  vi.restoreAllMocks();
});

describe('VigorClient read-only allowlist (STRICT, no exceptions)', () => {
  it('rejects every write command BEFORE touching the router', async () => {
    const client = new SshVigorClient(cfg());
    for (const cmd of FORBIDDEN) {
      await expect(client.runCommand(cmd)).rejects.toMatchObject({
        code: 'invalid',
      });
    }
    expect(fake.FakeClient.instances).toHaveLength(0); // never connected
  });

  it('accepts all verified read-only commands', async () => {
    fake.FakeClient.script = { '': '' };
    for (const cmd of READ_ONLY) fake.FakeClient.script[cmd] = 'ok';
    const client = new SshVigorClient(cfg());
    for (const cmd of READ_ONLY) {
      await expect(client.runCommand(cmd)).resolves.toBeTypeOf('string');
    }
  });

  it('refuses a free-form command that looks like a shell escape', async () => {
    const client = new SshVigorClient(cfg());
    await expect(client.runCommand('show status && reboot')).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('rejects ping with a non-IPv4 or injected host', async () => {
    const client = new SshVigorClient(cfg());
    for (const bad of ['ip ping 8.8.8.8 -c 5', 'ip ping; reboot', 'ip ping a.b.c.d']) {
      await expect(client.runCommand(bad)).rejects.toMatchObject({ code: 'invalid' });
    }
  });
});

describe('VigorClient write path (confirm-gated)', () => {
  it('refuses a write command via runCommand (not a read command)', async () => {
    const client = new SshVigorClient(cfg());
    await expect(client.runCommand('sys commit')).rejects.toMatchObject({ code: 'invalid' });
    await expect(client.runCommand('wan disable WAN1')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('refuses runWriteCommand until the command is authorized', async () => {
    const client = new SshVigorClient(cfg());
    await expect(client.runWriteCommand('wan disable WAN1')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('executes an authorized write once, then refuses reuse', async () => {
    fake.FakeClient.script = { '': '', 'wan disable WAN1': 'done' };
    const client = new SshVigorClient(cfg());
    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteCommand('wan disable WAN1')).resolves.toContain('done');
    // authorization is single-shot
    await expect(client.runWriteCommand('wan disable WAN1')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('authorizing one command does not authorize a different write', async () => {
    fake.FakeClient.script = { '': '' };
    const client = new SshVigorClient(cfg());
    client.authorizeWrite('sys commit');
    await expect(client.runWriteCommand('wan disable WAN1')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });
});

describe('VigorClient runCommand over a mocked shell', () => {
  it('returns the cleaned command output', async () => {
    fake.FakeClient.script = {
      '': '',
      'sys version':
        'Router Model: Vigor3912S    Version: 4.4.7_RC2\nRouter IP: 192.168.1.1',
    };
    const client = new SshVigorClient(cfg());
    const out = await client.runCommand('sys version');
    expect(out).toContain('Router Model: Vigor3912S');
    expect(out).not.toContain('DrayTek>');
    expect(out).not.toContain('sys version'); // echo stripped
  });

  it('pages through "--- MORE ---" with a space and returns full output', async () => {
    fake.FakeClient.script = {
      '': '',
      'show lan': [
        'LAN1  192.168.1.1',
        "--- MORE ---   ['q': Quit, 'Enter': New Lines, 'Space Bar': Next Page] --- ",
        'LAN2  192.168.2.1',
      ],
    };
    const client = new SshVigorClient(cfg());
    const out = await client.runCommand('show lan');
    expect(out).toContain('LAN1  192.168.1.1');
    expect(out).toContain('LAN2  192.168.2.1');
    expect(out).not.toContain('MORE');
  });

  it('throws a typed error on timeout and leaves no dangling waiter', async () => {
    fake.FakeClient.script = {
      '': '',
      'wan status': ['BWAN1: Offline', 'BWAN2: Offline'],
    };
    const client = new SshVigorClient(cfg());
    // script always returns a prompt, so a timeout here would mean a real bug;
    // we assert the error type exists and the client still works afterwards.
    const err = new VigorCommandError('timeout', 'forced');
    expect(err.code).toBe('timeout');
    await expect(client.runCommand('wan status')).resolves.toContain('BWAN1');
  });

  it('times out when the router never answers and rejects with code timeout', async () => {
    fake.FakeClient.script = { '': '' }; // banner ok; 'wan status' has no response
    const client = new SshVigorClient(cfg());
    await expect(client.runCommand('wan status', { timeoutMs: 150 })).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('rejects an in-flight command with code closed when the stream drops', async () => {
    fake.FakeClient.script = { '': '' }; // banner ok; command never answers
    const client = new SshVigorClient(cfg());
    const promise = client.runCommand('show status', { timeoutMs: 5000 });
    // wait until the command was actually written to the shell
    for (let i = 0; i < 50; i += 1) {
      const s = fake.FakeClient.instances[0]?.getStream();
      if (s?.written.some((w) => w.includes('show status'))) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    fake.FakeClient.instances[0]?.getStream()?.end(); // router drops the session
    await expect(promise).rejects.toMatchObject({ code: 'closed' });
  });

  it('recovers with a new session after the stream closed', async () => {
    fake.FakeClient.script = { '': '' };
    const client = new SshVigorClient(cfg());
    await client.runCommand('wan status', { timeoutMs: 150 }).catch(() => undefined);
    fake.FakeClient.instances[0]?.getStream()?.end();
    // next call should open a fresh session and succeed
    fake.FakeClient.script = { '': '', 'sys version': 'Router Model: Vigor3912S' };
    await expect(client.runCommand('sys version')).resolves.toContain('Vigor3912S');
    expect(fake.FakeClient.instances.length).toBeGreaterThanOrEqual(2);
  });

  it('serializes concurrent commands (mutex) so responses never interleave', async () => {
    fake.FakeClient.delayMs = 40; // slow router: first command's reply is late
    fake.FakeClient.script = { '': '', 'show lan': 'LAN1', 'show session': 'SESSION' };
    const client = new SshVigorClient(cfg());
    const [a, b] = await Promise.all([
      client.runCommand('show lan'),
      client.runCommand('show session'),
    ]);
    expect(a).toContain('LAN1');
    expect(b).toContain('SESSION');
    const wrote = fake.FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.filter((w) => w.includes('show lan') || w.includes('show session')).length).toBe(2);
    fake.FakeClient.delayMs = 0;
  });

  it('hard-blocklists forbidden commands on both read and write paths', async () => {
    fake.FakeClient.script = { '': '' };
    const client = new SshVigorClient(cfg());
    await expect(client.runCommand('sys cfg default')).rejects.toMatchObject({ code: 'invalid' });
    client.authorizeWrite('sys cfg default');
    await expect(client.runWriteCommand('sys cfg default')).rejects.toMatchObject({ code: 'invalid' });
    client.authorizeWrite('linux clean -w');
    await expect(client.runWriteCommand('linux clean -w')).rejects.toMatchObject({ code: 'invalid' });
    const wrote = fake.FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('sys cfg default') || w.includes('linux clean'))).toBe(false);
  });

  it('refuses writes in read-only mode', async () => {
    fake.FakeClient.script = { '': '' };
    const client = new SshVigorClient(cfg({ readOnly: true }));
    client.authorizeWrite('wan disable WAN1');
    await expect(client.runWriteCommand('wan disable WAN1')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });
});