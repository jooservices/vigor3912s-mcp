import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LogStore } from '../db/log.js';
import { FakeVigorClient } from '../test/fake-vigor-client.js';
import {
  buildSignPayload,
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
    expect(body.sign_payload).toBe(
      buildSignPayload(
        String(body.confirmation_id),
        String(body.nonce),
        String(body.command_digest),
        Number(body.expires_at),
      ).toString('utf8'),
    );
    expect(body.confirm_token).toBeUndefined();
    expect(client.written).toEqual([]);
  });

  it('rejects invalid SDK input before creating an intent and audits the denial', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('vpn_wg_peer')!;
    const input = { index: 1, action: 'allowedIps', allowedIps: '10.0.0.0/24', key: 'x' };

    await expect(
      executeWrite(cmd, input, client, { gate, store, autoCommit: false }),
    ).rejects.toThrow('invalid input for SDK operation "cli.vpn.wg.peer"');
    expect(gate.size).toBe(0);
    expect(store.query<{ status: string; error_code: string }>(
      'SELECT status, error_code FROM write_audit',
    )).toEqual([{ status: 'denied', error_code: 'invalid' }]);
  });

  it('keeps a WireGuard PSK out of the preview, pending file, and database logs', async () => {
    const { client } = setup();
    const pendingFile = path.join(dir, 'pending.json');
    const gate = new ConfirmGate(60_000, 100, pendingFile, pub);
    const key = randomBytes(32).toString('base64');
    expect(key).toHaveLength(44);
    const cmd = findCommand('vpn_wg_peer')!;
    const preview = await executeWrite(
      cmd,
      { index: 1, action: 'psk', key },
      client,
      { gate, store, autoCommit: false },
    );
    expect(preview.preview).toBe('vpn wg peer 1 psk <redacted:key>');
    expect(preview.redacted_fields).toEqual(['key']);
    const persisted = JSON.stringify({
      response: preview,
      pending: readFileSync(pendingFile, 'utf8'),
      requests: store.query('SELECT command, args_json, output FROM requests'),
      audit: store.query('SELECT command, before_snapshot, after_snapshot FROM write_audit'),
    });

    expect(preview.preview).not.toContain(key);
    expect(preview.sign_payload).not.toContain(key);
    expect(persisted).not.toContain(key);
  });

  it('rejects raw commands containing the redaction marker', async () => {
    const { client, gate } = setup();
    const cmd = { ...findCommand('user_set')!, render: () => 'user set <redacted:literal>' };
    await expect(executeWrite(cmd, { param: 'set <redacted:literal>' }, client, { gate, store, autoCommit: false }))
      .rejects.toMatchObject({ code: 'invalid' });
    expect(gate.pendingViews()).toHaveLength(0);
  });

  it('does not persist snapshots from a sensitive read command', async () => {
    const { client, gate } = setup();
    FakeVigorClient.script['radius show'] = `radius secret ${randomBytes(12).toString('hex')}`;
    FakeVigorClient.script['sys name wan1 Router'] = 'updated';
    const cmd = { ...findCommand('sys_name')!, snapshotRead: 'radius_show' };
    const result = await approve(gate, cmd, { wan: 'wan1', name: 'Router' }, client, false);
    expect(result.before).toContain('radius secret');
    expect(result.after).toContain('radius secret');
    expect(store.query<{ before_snapshot: string | null; after_snapshot: string | null }[]>(
      'SELECT before_snapshot, after_snapshot FROM write_audit WHERE status = \'executed\'',
    )).toEqual([{ before_snapshot: null, after_snapshot: null }]);
  });

  it('keeps a signed intent when cancellation arrives before execute', async () => {
    const { client, gate } = setup();
    const cmd = findCommand('sys_name')!;
    const args = { wan: 'wan1', name: 'Router' };
    const preview = await executeWrite(cmd, args, client, { gate, store, autoCommit: false });
    const signature = signApproval(keys.privateKeyPem, String(preview.confirmation_id), String(preview.nonce),
      String(preview.command_digest), Number(preview.expires_at));
    const controller = new AbortController();
    controller.abort();
    await expect(executeWrite(cmd, { ...args, confirmation_id: preview.confirmation_id, signature }, client, {
      gate, store, autoCommit: false, signal: controller.signal,
    })).rejects.toMatchObject({ code: 'cancelled' });
    expect(gate.size).toBe(1);
    expect(store.query<{ status: string; error_code: string }[]>(
      'SELECT status, error_code FROM write_audit ORDER BY id DESC LIMIT 1',
    )).toEqual([{ status: 'denied', error_code: 'cancelled' }]);
  });

  it('completes and audits a write when cancellation arrives after send', async () => {
    const { client, gate } = setup();
    const controller = new AbortController();
    const cmd = { ...findCommand('sys_name')!, sdk: undefined };
    const originalRunWrite = client.runWriteCommand.bind(client);
    vi.spyOn(client, 'runWriteCommand').mockImplementation(async (command, options) => {
      const result = await originalRunWrite(command, options);
      controller.abort();
      return result;
    });
    FakeVigorClient.script['sys name wan1 Router'] = 'updated';
    const args = { wan: 'wan1', name: 'Router' };
    const preview = await executeWrite(cmd, args, client, { gate, store, autoCommit: false });
    const signature = signApproval(keys.privateKeyPem, String(preview.confirmation_id), String(preview.nonce),
      String(preview.command_digest), Number(preview.expires_at));
    const result = await executeWrite(cmd, { ...args, confirmation_id: preview.confirmation_id, signature }, client, {
      gate, store, autoCommit: false, signal: controller.signal,
    });
    expect(result.status).toBe('done');
    expect(controller.signal.aborted).toBe(true);
    expect(store.query<{ status: string }[]>(
      "SELECT status FROM write_audit WHERE status = 'executed'",
    )).toHaveLength(1);
  });

  it('links the write audit to the exact insert id, or null when request logging fails', async () => {
    const { client, gate } = setup();
    const cmd = { ...findCommand('sys_name')!, sdk: undefined };
    FakeVigorClient.script['sys name wan1 Router'] = 'updated';
    const args = { wan: 'wan1', name: 'Router' };
    const preview = await executeWrite(cmd, args, client, { gate, store, autoCommit: false });
    const signature = signApproval(keys.privateKeyPem, String(preview.confirmation_id), String(preview.nonce),
      String(preview.command_digest), Number(preview.expires_at));
    const insert = vi.spyOn(store, 'request').mockReturnValueOnce(null);
    await executeWrite(cmd, { ...args, confirmation_id: preview.confirmation_id, signature }, client, {
      gate, store, autoCommit: false,
    });
    expect(insert).toHaveBeenCalledOnce();
    expect(store.query<{ request_id: number | null }[]>(
      "SELECT request_id FROM write_audit WHERE status = 'executed'",
    )).toEqual([{ request_id: null }]);
  });

  it('authorizes the exact validated input rendered in the preview', async () => {
    const { client, gate } = setup();
    const authorize = vi.spyOn(client, 'authorizeWrite');
    const cmd = findCommand('wan_disable')!;
    const input = { wan: 1 };
    const preview = await executeWrite(cmd, input, client, { gate, store, autoCommit: false });
    const signature = signApproval(
      keys.privateKeyPem,
      String(preview.confirmation_id),
      String(preview.nonce),
      String(preview.command_digest),
      Number(preview.expires_at),
    );
    FakeVigorClient.script[String(preview.preview)] = 'disabled';
    await executeWrite(
      cmd,
      { ...input, confirmation_id: preview.confirmation_id, signature, acknowledge: true },
      client,
      { gate, store, autoCommit: false },
    );

    expect(authorize).toHaveBeenCalledWith(preview.preview);
  });

  it('reports the configured confirmation TTL in the preview message', async () => {
    const { client } = setup();
    const gate = new ConfirmGate(30_000, 100, undefined, pub);
    const body = await executeWrite(findCommand('sys_name')!, { wan: 'wan1', name: 'R1' }, client, {
      gate,
      store,
      autoCommit: false,
    });

    expect(body.message).toContain('30 seconds');
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
