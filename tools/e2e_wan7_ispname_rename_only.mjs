#!/usr/bin/env node
/**
 * Live: rename WAN7 ISP name only — does NOT revert.
 * Wait for operator check, then run e2e_wan7_ispname_live.mjs or a revert script.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signApproval } from '../dist/tools/approve-crypto.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const WAN = 7;
const TEMP = 'JOOe2eWan7';

for (const line of fs.readFileSync(path.join(cwd, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && process.env[m[1].trim()] === undefined) process.env[m[1].trim()] = m[2];
}

const pubPem = fs.readFileSync(path.join(cwd, 'data/keys/approve-public.pem'), 'utf8');
const privPem = fs.readFileSync(path.join(cwd, 'data/keys/approve-private.pem'), 'utf8');
process.env.EXPOSE_TOOLS = 'show_status,internet_view,internet_set';
process.env.VIGOR_READ_ONLY = 'false';
process.env.VIGOR_AUTO_COMMIT = 'true';
process.env.VIGOR_APPROVE_PUBKEY = pubPem;

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  cwd,
  env: process.env,
});
const mcp = new Client({ name: 'vigor3912s-wan7-rename-only', version: '0.0.1' });
const textOf = (res) => res.content?.find((c) => c.type === 'text')?.text ?? '';

function parseJsonText(raw) {
  let v = JSON.parse(raw);
  if (typeof v === 'string') v = JSON.parse(v);
  return v;
}

function signPreview(body) {
  return signApproval(
    privPem,
    body.confirmation_id,
    body.nonce,
    body.command_digest,
    body.expires_at,
  );
}

try {
  await mcp.connect(transport);
  const beforeRes = await mcp.callTool({ name: 'show_status', arguments: {} });
  if (beforeRes.isError) throw new Error(textOf(beforeRes));
  const beforeBody = parseJsonText(textOf(beforeRes));
  const wan = (beforeBody.wans ?? []).find((w) => w.index === WAN);
  const beforeName = String(wan?.name ?? '');
  console.log(`[before] WAN${WAN} name=${beforeName} mode=${wan?.mode}`);

  const args = { wan: WAN, mode: 1, ispName: TEMP };
  const previewRes = await mcp.callTool({ name: 'internet_set', arguments: args });
  if (previewRes.isError) throw new Error(textOf(previewRes));
  const body = JSON.parse(textOf(previewRes));
  const doneRes = await mcp.callTool({
    name: 'internet_set',
    arguments: {
      ...args,
      confirmation_id: body.confirmation_id,
      signature: signPreview(body),
      acknowledge: true,
    },
  });
  if (doneRes.isError) throw new Error(textOf(doneRes));
  const done = JSON.parse(textOf(doneRes));
  console.log(`[change] cmd=${done.command} status=${done.status} commit=${done.commit}`);

  const afterRes = await mcp.callTool({ name: 'show_status', arguments: {} });
  const afterBody = parseJsonText(textOf(afterRes));
  const afterWan = (afterBody.wans ?? []).find((w) => w.index === WAN);
  console.log(`[after] WAN${WAN} name=${afterWan?.name}`);
  console.log(`[stopped] left as ${TEMP}; original was ${beforeName}; waiting for your check`);
  await mcp.close();
  process.exit(0);
} catch (e) {
  console.error('FAIL', e instanceof Error ? e.message : String(e));
  try {
    await mcp.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
}
