import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../index.js';
import { FakeVigorClient } from '../test/fake-vigor-client.js';
import { generateApproveKeyPair, publicKeyToConfigValue, signApproval } from '../tools/approve-crypto.js';
import { findCommand } from './registry/index.js';

const keys = generateApproveKeyPair();
const approvePublicKey = publicKeyToConfigValue(keys.publicKeyPem);
const packageVersion = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
).version as string;

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

afterEach(() => {
  FakeVigorClient.instances = [];
  FakeVigorClient.script = {};
  vi.restoreAllMocks();
});

describe('SDK-backed tool wiring (T2a infrastructure)', () => {
  it('reports the package version during MCP initialization', async () => {
    const { mcp, server } = await startServer();
    expect(mcp.getServerVersion()?.version).toBe(packageVersion);
    await server.close();
  });

  it('auto-linked curated zero-arg read tools carry a cmd.sdk binding', () => {
    const cmd = findCommand('sys_version');
    expect(cmd?.sdk?.manifestId).toBe('cli.sys.version');
  });

  it('auto-linked curated zero-arg write tools carry a cmd.sdk binding', () => {
    const cmd = findCommand('sys_commit');
    expect(cmd?.sdk?.manifestId).toBe('cli.sys.commit');
  });

  it('read tool executes via runOperation and returns SDK-formatted output', async () => {
    FakeVigorClient.script = {
      '': '',
      'sys version': 'Router Model: Vigor3912S    Version: 4.4.7_RC2 r5704 English\n',
    };
    const { mcp, server } = await startServer();
    const res = await mcp.callTool({ name: 'sys_version', arguments: {} });
    expect(textOf(res)).toContain('Vigor3912S');
    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.filter((w) => w.includes('sys version')).length).toBe(1);
    await server.close();
  });

  it('confirmed write tool executes via runWriteOperation with typed input (confirm -> authorize -> invoke -> commit skipped)', async () => {
    FakeVigorClient.script = {
      '': '',
      'sys commit': 'Configuration is saved.',
    };
    const { mcp, server, store } = await startServer();
    const preview = await mcp.callTool({ name: 'sys_commit', arguments: {} });
    const p = JSON.parse(textOf(preview));
    expect(p.status).toBe('needs_confirmation');

    const done = await mcp.callTool({
      name: 'sys_commit',
      arguments: { confirmation_id: p.confirmation_id, signature: signPreview(p) },
    });
    const body = JSON.parse(textOf(done));
    expect(body.status).toBe('done');
    expect(body.command).toBe('sys commit');
    // sys_commit policy sets skipCommit: true — the auto-commit chain is not run again.
    expect(body.commit).toBe('skipped');

    const wrote = FakeVigorClient.instances.flatMap((c) => c.getStream()?.written ?? []);
    expect(wrote.filter((w) => w.includes('sys commit')).length).toBe(1);

    const audits = store.query<Array<{ status: string; success: number | null }>>(
      'SELECT status, success FROM write_audit ORDER BY id',
    );
    expect(audits.map((a) => a.status)).toEqual(['preview', 'executed']);
    expect(audits[1]?.success).toBe(1);
    await server.close();
  });

  it('redacts credentials from generated SDK write previews and audit logs', async () => {
    const password = `password-${randomUUID()}`;
    const { mcp, server, store } = await startServer();
    const preview = await mcp.callTool({
      name: 'service_login',
      arguments: { account: 'test-account', password },
    });
    const body = JSON.parse(textOf(preview));
    expect(body.preview).toContain('***');
    expect(body.preview).not.toContain(password);
    expect(body.message).not.toContain(password);

    const request = store.query<Array<{ command: string; args_json: string }>>(
      'SELECT command, args_json FROM requests ORDER BY id LIMIT 1',
    )[0];
    expect(request?.command).toContain('***');
    expect(request?.args_json).toContain('***');
    expect(request?.command).not.toContain(password);
    expect(request?.args_json).not.toContain(password);
    await server.close();
  });
});
