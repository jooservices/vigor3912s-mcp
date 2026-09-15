import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../index.js';
import { FakeVigorClient } from '../test/fake-vigor-client.js';
import {
  generateApproveKeyPair,
  publicKeyToConfigValue,
  signApproval,
} from '../tools/approve-crypto.js';
import { readCommands, writeCommands } from './registry/index.js';

const keys = generateApproveKeyPair();
const approvePublicKey = publicKeyToConfigValue(keys.publicKeyPem);

function cfg(overrides: Record<string, unknown> = {}) {
  return {
    host: '192.168.1.1',
    port: 22,
    username: 'admin',
    password: 'secret',
    logDb: ':memory:',
    readOnly: false,
    autoCommit: false,
    approvePublicKey,
    exposeTools: [],
    disabledTools: [],
    toolOutputLimit: 16000,
    sshInsecureSkipHostVerify: true,
    ...overrides,
  };
}

function signPreview(body: {
  confirmation_id: string;
  nonce: string;
  command_digest: string;
  expires_at: number;
}): string {
  return signApproval(
    keys.privateKeyPem,
    body.confirmation_id,
    body.nonce,
    body.command_digest,
    body.expires_at,
  );
}

async function startServer(cfgValue = cfg()) {
  const fake = new FakeVigorClient(Boolean(cfgValue.readOnly));
  const { server, store } = buildServer(cfgValue as never, { client: fake });
  const [serverT, clientT] = InMemoryTransport.createLinkedPair();
  await serverT.start();
  await clientT.start();
  await server.connect(serverT);
  const mcp = new Client({ name: 'test', version: '0.0.1' });
  await mcp.connect(clientT);
  return { mcp, server, store };
}

function textOf(res: unknown): string {
  const r = res as {
    content?: Array<{ type?: string; text?: string }>;
    toolResult?: { content?: Array<{ type?: string; text?: string }> };
  };
  const content = r.content ?? r.toolResult?.content;
  return content?.find((c) => c.type === 'text')?.text ?? '';
}

function isError(res: unknown): boolean {
  return (res as { isError?: boolean }).isError === true;
}

afterEach(() => {
  FakeVigorClient.instances = [];
  FakeVigorClient.script = {};
  vi.restoreAllMocks();
});

describe('registry -> MCP tool generation', () => {
  it('registers every read and write command as a tool', async () => {
    const { mcp, server } = await startServer();
    const tools = await mcp.listTools();
    const names = new Set(tools.tools.map((t) => t.name));
    for (const c of [...readCommands(), ...writeCommands()]) {
      expect(names.has(c.id), `missing tool ${c.id}`).toBe(true);
    }
    expect(tools.tools.length).toBe(readCommands().length + writeCommands().length);
    await server.close();
  });

  it('calls a read tool and returns structured output', async () => {
    FakeVigorClient.script = {
      '': '',
      'show session': 'Maximum Session Number: 500000\nCurrent Session Usage: 110',
    };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'show_session', arguments: {} });
    expect(textOf(res)).toContain('Current Session Usage: 110');
    await server.close();
  });

  it('passes validated args into the rendered read command (ip_ping)', async () => {
    FakeVigorClient.script = {
      '': '',
      'ip ping 8.8.8.8': 'Packets: Sent = 5, Received = 5, Lost = 0 (0% loss)',
    };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'ip_ping', arguments: { host: '8.8.8.8' } });
    const body = JSON.parse(textOf(res));
    expect(body).toContain('Packets: Sent = 5');
    await server.close();
  });

  it('write tool preview does NOT send anything to the router', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(res));
    expect(body.status).toBe('needs_confirmation');
    expect(body.preview).toBe('wan disable WAN1');
    expect(typeof body.confirmation_id).toBe('string');
    expect(typeof body.command_digest).toBe('string');
    expect(body.confirm_token).toBeUndefined();
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('wan disable'))).toBe(false);
    await server.close();
  });

  it('confirmed write executes exactly the rendered command once', async () => {
    FakeVigorClient.script = {
      '': '',
      'wan disable WAN1': '% done',
      'wan status': 'BWAN1: Offline',
    };
    const { mcp, server, store } = await startServer();
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const p = JSON.parse(textOf(preview));
    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirmation_id: p.confirmation_id, signature: signPreview(p), acknowledge: true },
    });
    const body = JSON.parse(textOf(done));
    expect(body.status).toBe('done');
    expect(body.command).toBe('wan disable WAN1');
    expect(body.before).toContain('BWAN1');
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.filter((w) => w.includes('wan disable WAN1')).length).toBe(1);

    const audits = store.query<
      Array<{ status: string; success: number | null; before_snapshot: string | null; after_snapshot: string | null }>
    >('SELECT status, success, before_snapshot, after_snapshot FROM write_audit ORDER BY id');
    expect(audits.map((a) => a.status)).toEqual(['preview', 'executed']);
    const exec = audits[1];
    expect(exec?.success).toBe(1);
    expect(exec?.before_snapshot).toContain('BWAN1');
    expect(exec?.after_snapshot).toContain('BWAN1');
    const reqs = store.query<Array<{ kind: string; outcome: string }>>(
      'SELECT kind, outcome FROM requests ORDER BY id',
    );
    expect(reqs.map((r) => `${r.kind}:${r.outcome}`)).toEqual([
      'write:needs_confirmation',
      'write:ok',
    ]);
    await server.close();
  });

  it('rejects a write with an invalid signature', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const p = JSON.parse(textOf(preview));
    const res = await mcp.callTool({
      name: 'wan_disable',
      arguments: {
        wan: 1,
        confirmation_id: p.confirmation_id,
        signature: Buffer.alloc(64).toString('base64'),
        acknowledge: true,
      },
    });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res.content)).toMatch(/signature|invalid/i);
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('wan disable'))).toBe(false);
    await server.close();
  });

  it('args validation rejects invalid input before any command is built', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 99 },
    });
    expect(isError(res)).toBe(true);
    await server.close();
  });

  it('blocks CLI injection via control characters in write params', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({
      name: 'vpn_ovpn',
      arguments: { param: 'mode 1\rwan disable WAN1' },
    });
    expect(isError(res)).toBe(true);
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('wan disable'))).toBe(false);
    await server.close();
  });

  it('blocks shell metacharacters in write params', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    for (const bad of ['x; reboot', 'x & reboot', 'x`reboot`', 'x$reboot']) {
      const res = await mcp.callTool({
        name: 'vpn_ovpn',
        arguments: { param: bad },
      });
      expect(isError(res), `should reject ${JSON.stringify(bad)}`).toBe(true);
    }
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('reboot'))).toBe(false);
    await server.close();
  });

  it('allows a write preview for a clean parameter (no false positives)', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({
      name: 'qos_setup',
      arguments: { showAll: true },
    });
    const body = JSON.parse(textOf(res));
    expect(body.status).toBe('needs_confirmation');
    expect(body.preview).toBe('qos setup -V');
    await server.close();
  });

  it('marks dual-confirm writes and requires acknowledge: true (signature preserved)', async () => {
    FakeVigorClient.script = { '': '', 'wan disable WAN1': '% done', 'wan status': 'BWAN1: Offline' };
    const { mcp, server } = await startServer();
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(preview));
    expect(body.dangerous).toBe(true);
    expect(body.confirm_tier).toBe('dual');
    const signature = signPreview(body);

    const denied = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirmation_id: body.confirmation_id, signature },
    });
    expect(isError(denied)).toBe(true);
    expect(JSON.stringify(denied.content)).toContain('acknowledge');
    const wrote0 = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote0.some((w) => w.includes('wan disable'))).toBe(false);

    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirmation_id: body.confirmation_id, signature, acknowledge: true },
    });
    expect(JSON.parse(textOf(done)).status).toBe('done');
    await server.close();
  });

  it('read-only mode registers no write tools', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer(cfg({ readOnly: true, approvePublicKey: undefined }));
    const tools = await mcp.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('show_session');
    for (const w of writeCommands()) expect(names).not.toContain(w.id);
    await server.close();
  });

  it('exposeTools allowlist and disabledTools denylist filter registration', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer(
      cfg({ exposeTools: ['show_session', 'wan_status'], disabledTools: ['wan_status'] }),
    );
    const names = new Set((await mcp.listTools()).tools.map((t) => t.name));
    expect(names.has('show_session')).toBe(true);
    expect(names.has('wan_status')).toBe(false);
    expect(names.has('sys_version')).toBe(false);
    await server.close();
  });

  it('auto-commit runs sys commit after a write and records commit_status', async () => {
    FakeVigorClient.script = {
      '': '',
      'wan disable WAN1': '% done',
      'wan status': 'BWAN1: Offline',
      'sys commit': '% committed',
    };
    const { mcp, server, store } = await startServer(cfg({ autoCommit: true }));
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const p = JSON.parse(textOf(preview));
    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: {
        wan: 1,
        confirmation_id: p.confirmation_id,
        signature: signPreview(p),
        acknowledge: true,
      },
    });
    expect(JSON.parse(textOf(done)).commit).toBe('ok');
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('sys commit'))).toBe(true);
    const audit = store.query<Array<{ status: string; commit_status: string | null }>>(
      "SELECT status, commit_status FROM write_audit WHERE status='executed'",
    );
    expect(audit[0]?.commit_status).toBe('ok');
    await server.close();
  });

  it('caps large read tool output with a truncated flag', async () => {
    FakeVigorClient.script = { '': '', 'show lan': 'A'.repeat(5000) };
    const { mcp, server } = await startServer(cfg({ toolOutputLimit: 200 }));
    const res = await mcp.callTool({ name: 'show_lan', arguments: {} });
    const body = JSON.parse(textOf(res));
    expect(body.truncated).toBe(true);
    expect(body.output.length).toBeLessThan(300);
    await server.close();
  });

  it('preview requires cryptographic signature fields (no model token)', async () => {
    FakeVigorClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(res));
    expect(body.confirm_token).toBeUndefined();
    expect(body.sign_payload).toContain(body.confirmation_id);
    expect(body.message).toContain('signature');
    await server.close();
  });
});
