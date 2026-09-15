#!/usr/bin/env node
/**
 * Live: rename WAN7 ISP display name (internet -S), verify, revert.
 * Does NOT use sys_name.
 *
 * Usage: node tools/e2e_wan7_ispname_live.mjs
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
const ORIGINAL = 'home5-super';
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
const mcp = new Client({ name: 'vigor3912s-wan7-isp', version: '0.0.1' });

const textOf = (res) => res.content?.find((c) => c.type === 'text')?.text ?? '';

function parseJsonText(raw) {
  let v = JSON.parse(raw);
  if (typeof v === 'string') v = JSON.parse(v);
  return v;
}

async function wan7Name() {
  const res = await mcp.callTool({ name: 'show_status', arguments: {} });
  if (res.isError) throw new Error(textOf(res));
  const body = parseJsonText(textOf(res));
  const wan = (body.wans ?? []).find((w) => w.index === WAN);
  if (!wan) throw new Error(`WAN${WAN} missing from show_status`);
  return { name: String(wan.name ?? ''), modeHint: wan.mode, raw: wan };
}

/** Best-effort: PPPoE → mode 1 per UG examples. */
function guessMode(wan) {
  const m = String(wan.mode ?? '').toLowerCase();
  if (m.includes('pppoe')) return 1;
  if (m.includes('static')) return 4;
  if (m.includes('dhcp') || m.includes('dynamic')) return 3;
  return 1;
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

async function setIspName(mode, ispName) {
  const args = { wan: WAN, mode, ispName };
  const previewRes = await mcp.callTool({ name: 'internet_set', arguments: args });
  if (previewRes.isError) throw new Error(`preview: ${textOf(previewRes)}`);
  const body = JSON.parse(textOf(previewRes));
  if (body.status !== 'needs_confirmation') {
    throw new Error(`expected needs_confirmation: ${JSON.stringify(body)}`);
  }
  const doneRes = await mcp.callTool({
    name: 'internet_set',
    arguments: {
      ...args,
      confirmation_id: body.confirmation_id,
      signature: signPreview(body),
      acknowledge: true,
    },
  });
  if (doneRes.isError) throw new Error(`execute: ${textOf(doneRes)}`);
  return JSON.parse(textOf(doneRes));
}

const log = (step, detail) => console.log(`[${step}] ${detail}`);

try {
  await mcp.connect(transport);
  const before = await wan7Name();
  log('1_read', `name=${before.name} modeHint=${before.modeHint}`);
  if (before.name !== ORIGINAL) {
    log('warn', `expected ${ORIGINAL}, got ${before.name} — continuing with observed original`);
  }
  const original = before.name || ORIGINAL;
  const mode = guessMode(before.raw);
  log('mode', `using internet -M ${mode}`);

  const change = await setIspName(mode, TEMP);
  log(
    '2_change',
    `cmd=${change.command} status=${change.status} commit=${change.commit} out=${String(change.output ?? '').slice(0, 120)}`,
  );

  const mid = await wan7Name();
  log('3_read_changed', mid.name);
  if (mid.name !== TEMP) {
    throw new Error(`change verify failed: want ${TEMP}, got ${mid.name}`);
  }

  const revert = await setIspName(mode, original);
  log('4_revert', `cmd=${revert.command} status=${revert.status} commit=${revert.commit}`);

  const after = await wan7Name();
  log('5_verify', after.name);
  if (after.name !== original) {
    throw new Error(`revert verify failed: want ${original}, got ${after.name}`);
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
