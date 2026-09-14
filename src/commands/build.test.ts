import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCommands, writeCommands } from './registry.js';
import { buildServer } from '../index.js';
import { FakeClient } from '../test/fake-ssh2.js';

vi.mock('ssh2', async () => {
  const mod = await import('../test/fake-ssh2.js');
  return { Client: mod.FakeClient };
});

function cfg(overrides: Record<string, unknown> = {}) {
  return {
    host: '192.168.1.1',
    port: 22,
    username: 'admin',
    password: 'secret',
    logDb: ':memory:',
    readOnly: false,
    autoCommit: false,
    humanConfirm: false,
    confirmPassphrase: undefined,
    exposeTools: [],
    disabledTools: [],
    toolOutputLimit: 16000,
    ...overrides,
  };
}

async function startServer(cfgValue = cfg()) {
  const { server, store } = buildServer(cfgValue as never);
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
  FakeClient.instances = [];
  FakeClient.script = {};
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
    FakeClient.script = {
      '': '',
      'show session': 'Maximum Session Number: 500000\nCurrent Session Usage: 110',
    };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'show_session', arguments: {} });
    expect(textOf(res)).toContain('Current Session Usage: 110');
    await server.close();
  });

  it('write tool preview does NOT send anything to the router', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(res));
    expect(body.status).toBe('needs_confirmation');
    expect(body.preview).toBe('wan disable WAN1');
    expect(typeof body.confirm_token).toBe('string');
    // nothing was written to the shell for the preview
    const wrote = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('wan disable'))).toBe(false);
    await server.close();
  });

  it('confirmed write executes exactly the rendered command once', async () => {
    FakeClient.script = {
      '': '',
      'wan disable WAN1': '% done',
      'wan status': 'BWAN1: Offline',
    };
    const { mcp, server, store } = await startServer();
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const token = JSON.parse(textOf(preview)).confirm_token;
    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirm_token: token, acknowledge: true },
    });
    const body = JSON.parse(textOf(done));
    expect(body.status).toBe('done');
    expect(body.command).toBe('wan disable WAN1');
    expect(body.before).toContain('BWAN1');
    const wrote = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.filter((w) => w.includes('wan disable WAN1')).length).toBe(1);

    // SQLite audit: preview + executed rows with before/after snapshot
    const audits = store.query<Array<{ status: string; success: number | null; before_snapshot: string | null; after_snapshot: string | null }>>(
      'SELECT status, success, before_snapshot, after_snapshot FROM write_audit ORDER BY id',
    );
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

  it('rejects a write with an invalid / mismatched token', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirm_token: 'bogus', acknowledge: true },
    });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res.content)).toContain('not found');
    const wrote = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('wan disable'))).toBe(false);
    await server.close();
  });

  it('args validation rejects invalid input before any command is built', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 99 },
    });
    expect(isError(res)).toBe(true);
    await server.close();
  });

  it('blocks CLI injection via control characters in write params', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    // CR would terminate the CLI line and inject a second command.
    const res = await mcp.callTool({
      name: 'ipf_rule',
      arguments: { param: 'drop all\rwan disable WAN1' },
    });
    expect(isError(res)).toBe(true);
    const wrote = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('wan disable'))).toBe(false);
    await server.close();
  });

  it('blocks shell metacharacters in write params', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    for (const bad of ['x; reboot', 'x & reboot', 'x`reboot`', 'x$reboot']) {
      const res = await mcp.callTool({ name: 'qos_setup', arguments: { param: bad } });
      expect(isError(res), `should reject ${JSON.stringify(bad)}`).toBe(true);
    }
    const wrote = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('reboot'))).toBe(false);
    await server.close();
  });

  it('allows a write preview for a clean parameter (no false positives)', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({
      name: 'qos_setup',
      arguments: { param: 'limit bandwidth 1000' },
    });
    const body = JSON.parse(textOf(res));
    expect(body.status).toBe('needs_confirmation');
    expect(body.preview).toBe('qos setup limit bandwidth 1000');
    await server.close();
  });

  it('marks dangerous writes and requires acknowledge: true (token preserved)', async () => {
    FakeClient.script = { '': '', 'wan disable WAN1': '% done', 'wan status': 'BWAN1: Offline' };
    const { mcp, server } = await startServer();
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(preview));
    expect(body.dangerous).toBe(true);
    const token = body.confirm_token;

    // confirm without acknowledge -> denied, token NOT consumed
    const denied = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirm_token: token },
    });
    expect(isError(denied)).toBe(true);
    expect(JSON.stringify(denied.content)).toContain('acknowledge');
    const wrote0 = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote0.some((w) => w.includes('wan disable'))).toBe(false);

    // same token still valid with acknowledge -> executes
    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirm_token: token, acknowledge: true },
    });
    expect(JSON.parse(textOf(done)).status).toBe('done');
    await server.close();
  });

  it('read-only mode registers no write tools', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer(cfg({ readOnly: true }));
    const tools = await mcp.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('show_session');
    for (const w of writeCommands()) expect(names).not.toContain(w.id);
    await server.close();
  });

  it('exposeTools allowlist and disabledTools denylist filter registration', async () => {
    FakeClient.script = { '': '' };
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
    FakeClient.script = {
      '': '',
      'wan disable WAN1': '% done',
      'wan status': 'BWAN1: Offline',
      'sys commit': '% committed',
    };
    const { mcp, server, store } = await startServer(cfg({ autoCommit: true }));
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const token = JSON.parse(textOf(preview)).confirm_token;
    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirm_token: token, acknowledge: true },
    });
    expect(JSON.parse(textOf(done)).commit).toBe('ok');
    const wrote = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.some((w) => w.includes('sys commit'))).toBe(true);
    const audit = store.query<Array<{ status: string; commit_status: string | null }>>(
      "SELECT status, commit_status FROM write_audit WHERE status='executed'",
    );
    expect(audit[0]?.commit_status).toBe('ok');
    await server.close();
  });

  it('caps large read tool output with a truncated flag', async () => {
    FakeClient.script = { '': '', 'show lan': 'A'.repeat(5000) };
    const { mcp, server } = await startServer(cfg({ toolOutputLimit: 200 }));
    const res = await mcp.callTool({ name: 'show_lan', arguments: {} });
    const body = JSON.parse(textOf(res));
    expect(body.truncated).toBe(true);
    expect(body.output.length).toBeLessThan(300);
    await server.close();
  });

  it('default mode (humanConfirm off) returns the token in the preview', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(res));
    expect(body.human_confirm).toBe(false);
    expect(typeof body.confirm_token).toBe('string');
    expect(body.message).toContain('approval');
    await server.close();
  });

  it('human-confirm mode hides the token and rejects a wrong user code', async () => {
    FakeClient.script = { '': '', 'wan disable WAN1': '% done', 'wan status': 'BWAN1: Offline' };
    const { mcp, server, store } = await startServer(
      cfg({ humanConfirm: true, confirmPassphrase: 'secret-passphrase' }),
    );
    const preview = await mcp.callTool({ name: 'wan_disable', arguments: { wan: 1 } });
    const body = JSON.parse(textOf(preview));
    expect(body.human_confirm).toBe(true);
    expect(body.confirm_token).toBeUndefined(); // token hidden from the model
    expect(typeof body.confirmation_id).toBe('string');
    expect(body.message).toContain('confirmation code');

    // wrong code -> denied, nothing sent to the router
    const denied = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirmation_id: body.confirmation_id, user_code: 'wrong', acknowledge: true },
    });
    expect(isError(denied)).toBe(true);
    expect(JSON.stringify(denied.content)).toContain('wrong confirmation code');
    const wrote0 = FakeClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote0.some((w) => w.includes('wan disable'))).toBe(false);

    // correct code -> executes
    const done = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirmation_id: body.confirmation_id, user_code: 'secret-passphrase', acknowledge: true },
    });
    expect(JSON.parse(textOf(done)).status).toBe('done');
    await server.close();
  });

  it('human-confirm mode requires confirmation_id and user_code', async () => {
    FakeClient.script = { '': '' };
    const { mcp, server } = await startServer(
      cfg({ humanConfirm: true, confirmPassphrase: 'secret-passphrase' }),
    );
    // has a confirmation_id but no user_code -> denied
    const res = await mcp.callTool({
      name: 'wan_disable',
      arguments: { wan: 1, confirmation_id: 'bogus', acknowledge: true },
    });
    expect(isError(res)).toBe(true);
    expect(JSON.stringify(res.content)).toContain('requires confirmation_id and user_code');
    await server.close();
  });
});