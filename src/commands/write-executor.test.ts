import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LogStore } from '../db/log.js';
import { FakeVigorClient } from '../test/fake-vigor-client.js';
import {
  generateApproveKeyPair,
  publicKeyToConfigValue,
  signApproval,
} from '../tools/approve-crypto.js';
import { ConfirmGate } from '../tools/confirm-gate.js';
import { findCommand } from './registry/index.js';
import { executeWrite } from './write-executor.js';

const keys = generateApproveKeyPair();
const pub = publicKeyToConfigValue(keys.publicKeyPem);

describe('executeWrite', () => {
  let dir: string;
  let store: LogStore;

  afterEach(() => {
    FakeVigorClient.instances = [];
    FakeVigorClient.script = {};
    store?.close();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function setup() {
    dir = mkdtempSync(path.join(tmpdir(), 'vigor-write-'));
    store = new LogStore(path.join(dir, 'log.db'));
    FakeVigorClient.instances = [];
    FakeVigorClient.script = { '': '' };
    const client = new FakeVigorClient(false);
    const gate = new ConfirmGate(60_000, 100, undefined, pub);
    return { client, gate };
  }

  async function approve(
    gate: ConfirmGate,
    cmd: ReturnType<typeof findCommand> & object,
    args: Record<string, unknown>,
    client: FakeVigorClient,
    autoCommit: boolean,
  ) {
    const preview = await executeWrite(cmd as never, args, client, { gate, store, autoCommit });
    expect(preview.status).toBe('needs_confirmation');
    const signature = signApproval(
      keys.privateKeyPem,
      String(preview.confirmation_id),
      String(preview.nonce),
      String(preview.command_digest),
      Number(preview.expires_at),
    );
    return executeWrite(
      cmd as never,
      { ...args, confirmation_id: preview.confirmation_id, signature },
      client,
      { gate, store, autoCommit },
    );
  }

  it('write auto tier still requires signature (no bypass)', async () => {
    const { client, gate } = setup();
    FakeVigorClient.script['sys commit'] = 'ok';
    const cmd = {
      ...findCommand('sys_commit')!,
      confirm: 'auto' as const,
      dangerous: false,
    };
    const body = await executeWrite(cmd, {}, client, { gate, store, autoCommit: false });
    expect(body.status).toBe('needs_confirmation');
    expect(client.written).toEqual([]);
  });

  it('preview returns digest fields and does not touch the router', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('sys_name')!;
    const body = await executeWrite(cmd, { wan: 'wan1', name: 'R1' }, client, {
      gate,
      store,
      autoCommit: true,
    });
    expect(body.status).toBe('needs_confirmation');
    expect(body.confirm_tier).toBe('confirm');
    expect(body.confirmation_id).toBeTruthy();
    expect(body.command_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(body.confirm_token).toBeUndefined();
    expect(client.written).toEqual([]);
  });

  it('confirmed write with autoCommit runs sys commit', async () => {
    const { client, gate } = setup();
    FakeVigorClient.script['sys name wan1 R1'] = 'done';
    FakeVigorClient.script['sys commit'] = 'saved';
    const cmd = findCommand('sys_name')!;
    const done = await approve(gate, cmd, { wan: 'wan1', name: 'R1' }, client, true);
    expect(done.status).toBe('done');
    expect(done.commit).toBe('ok');
  });

  it('returns commit_failed when sys commit throws (not done/success)', async () => {
    const { client, gate } = setup();
    FakeVigorClient.script['sys name wan1 R1'] = 'done';
    const cmd = findCommand('sys_name')!;
    const done = await approve(gate, cmd, { wan: 'wan1', name: 'R1' }, client, true);
    expect(done.status).toBe('commit_failed');
    expect(done.commit).toBe('failed');
  });

  it('surfaces write execution errors', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('sys_name')!;
    const preview = await executeWrite(cmd, { wan: 'wan1', name: 'R1' }, client, {
      gate,
      store,
      autoCommit: false,
    });
    const signature = signApproval(
      keys.privateKeyPem,
      String(preview.confirmation_id),
      String(preview.nonce),
      String(preview.command_digest),
      Number(preview.expires_at),
    );
    await expect(
      executeWrite(
        cmd,
        { wan: 'wan1', name: 'R1', confirmation_id: preview.confirmation_id, signature },
        client,
        { gate, store, autoCommit: false },
      ),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('treats router % Invalid command as failure', async () => {
    const { client, gate } = setup();
    FakeVigorClient.script['sys name wan1 R1'] = '% Invalid command';
    const cmd = findCommand('sys_name')!;
    await expect(approve(gate, cmd, { wan: 'wan1', name: 'R1' }, client, false)).rejects.toMatchObject({
      code: 'router_error',
    });
  });

  it('dual write requires acknowledge before consuming signature', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('wan_disable')!;
    const preview = await executeWrite(cmd, { wan: 1 }, client, {
      gate,
      store,
      autoCommit: false,
    });
    const signature = signApproval(
      keys.privateKeyPem,
      String(preview.confirmation_id),
      String(preview.nonce),
      String(preview.command_digest),
      Number(preview.expires_at),
    );
    await expect(
      executeWrite(
        cmd,
        { wan: 1, confirmation_id: preview.confirmation_id, signature },
        client,
        { gate, store, autoCommit: false },
      ),
    ).rejects.toThrow(/acknowledge/);
    // Intent still pending — acknowledge + signature works.
    FakeVigorClient.script['wan disable WAN1'] = 'ok';
    const done = await executeWrite(
      cmd,
      { wan: 1, confirmation_id: preview.confirmation_id, signature, acknowledge: true },
      client,
      { gate, store, autoCommit: false },
    );
    expect(done.status).toBe('done');
  });

  it('rejects command mismatch after a valid signature payload for another render', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('sys_name')!;
    const preview = await executeWrite(cmd, { wan: 'wan1', name: 'R1' }, client, {
      gate,
      store,
      autoCommit: false,
    });
    const signature = signApproval(
      keys.privateKeyPem,
      String(preview.confirmation_id),
      String(preview.nonce),
      String(preview.command_digest),
      Number(preview.expires_at),
    );
    await expect(
      executeWrite(
        cmd,
        { wan: 'wan1', name: 'R2', confirmation_id: preview.confirmation_id, signature },
        client,
        { gate, store, autoCommit: false },
      ),
    ).rejects.toMatchObject({ code: 'mismatch' });
  });

  it('rejects when only confirmation_id or only signature is provided', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('sys_name')!;
    const preview = await executeWrite(cmd, { wan: 'wan1', name: 'R1' }, client, {
      gate,
      store,
      autoCommit: false,
    });
    await expect(
      executeWrite(
        cmd,
        { wan: 'wan1', name: 'R1', confirmation_id: preview.confirmation_id },
        client,
        { gate, store, autoCommit: false },
      ),
    ).rejects.toMatchObject({ code: 'invalid_token' });
  });

  it('treats router failure on sys commit as commit_failed', async () => {
    const { client, gate } = setup();
    FakeVigorClient.script['sys name wan1 R1'] = 'done';
    FakeVigorClient.script['sys commit'] = '% Invalid command';
    const cmd = findCommand('sys_name')!;
    const done = await approve(gate, cmd, { wan: 'wan1', name: 'R1' }, client, true);
    expect(done.status).toBe('commit_failed');
    expect(done.commit).toBe('failed');
  });
});
