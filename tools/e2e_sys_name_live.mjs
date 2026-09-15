#!/usr/bin/env node
/**
 * Live extreme-safe write probe: sys_name only.
 * read → change → verify → revert → verify
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signApproval } from '../dist/tools/approve-crypto.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const TEMP_NAME = 'JOOe2eSafe';

for (const line of fs.readFileSync(path.join(cwd, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && process.env[m[1].trim()] === undefined) process.env[m[1].trim()] = m[2];
}

const pubPem = fs.readFileSync(path.join(cwd, 'data/keys/approve-public.pem'), 'utf8');
const privPem = fs.readFileSync(path.join(cwd, 'data/keys/approve-private.pem'), 'utf8');
process.env.EXPOSE_TOOLS = 'sys_name,sys_version';
process.env.VIGOR_READ_ONLY = 'false';
process.env.VIGOR_AUTO_COMMIT = 'true';
process.env.VIGOR_APPROVE_PUBKEY = pubPem;

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  cwd,
  env: process.env,
});
const mcp = new Client({ name: 'vigor3912s-sys-name-live', version: '0.0.1' });

function textOf(res) {
  return res.content?.find((c) => c.type === 'text')?.text ?? '';
}

async function getRouterName() {
  const res = await mcp.callTool({ name: 'sys_version', arguments: {} });
  if (res.isError) throw new Error(`sys_version error: ${textOf(res)}`);
  const raw = textOf(res);
  const parsed = JSON.parse(raw);
  // MCP may double-encode
  const body = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  if (typeof body.routerName !== 'string') {
    throw new Error(`routerName missing: ${raw.slice(0, 200)}`);
  }
  return body.routerName;
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

async function setName(name) {
  const previewRes = await mcp.callTool({ name: 'sys_name', arguments: { name } });
  if (previewRes.isError) throw new Error(`preview error: ${textOf(previewRes)}`);
  const body = JSON.parse(textOf(previewRes));
  if (body.status !== 'needs_confirmation') {
    throw new Error(`expected needs_confirmation, got ${JSON.stringify(body)}`);
  }
  const doneRes = await mcp.callTool({
    name: 'sys_name',
    arguments: {
      name,
      confirmation_id: body.confirmation_id,
      signature: signPreview(body),
    },
  });
  if (doneRes.isError) throw new Error(`execute error: ${textOf(doneRes)}`);
  const done = JSON.parse(textOf(doneRes));
  return { preview: body, done };
}

const report = [];
const log = (step, detail) => {
  const line = `[${step}] ${detail}`;
  report.push(line);
  console.log(line);
};

try {
  await mcp.connect(transport);
  const tools = await mcp.listTools();
  const names = tools.tools.map((t) => t.name).sort();
  log('expose', names.join(','));

  const original = await getRouterName();
  log('1_read_original', original);

  const changedTo = original === TEMP_NAME ? `${TEMP_NAME}2` : TEMP_NAME;
  const change = await setName(changedTo);
  log(
    '2_change',
    `cmd=${change.done.command ?? change.preview.command} status=${change.done.status} commit=${change.done.commit ?? 'n/a'}`,
  );

  const afterChange = await getRouterName();
  log('3_read_changed', afterChange);
  if (afterChange !== changedTo) {
    throw new Error(`change verify failed: want ${changedTo}, got ${afterChange}`);
  }

  const revert = await setName(original);
  log(
    '4_revert',
    `cmd=${revert.done.command ?? revert.preview.command} status=${revert.done.status} commit=${revert.done.commit ?? 'n/a'}`,
  );

  const finalName = await getRouterName();
  log('5_verify_original', finalName);
  if (finalName !== original) {
    throw new Error(`revert verify failed: want ${original}, got ${finalName}`);
  }

  log('RESULT', 'ALL PASS');
  await mcp.close();
  process.exit(0);
} catch (e) {
  log('RESULT', `FAIL ${e instanceof Error ? e.message : String(e)}`);
  try {
    await mcp.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
}
