#!/usr/bin/env node
/**
 * E2E for ONE read tool against the real router (fresh SSH session, then
 * closed). Records pass in recon-output/e2e-passed.json so a later run skips
 * it. Write tools are never called.
 *
 * Usage: node tools/e2e_one.mjs <toolId>
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCommands, findCommand } from '../dist/commands/registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const STATE_FILE = path.join(cwd, 'recon-output', 'e2e-passed.json');

const id = process.argv[2];
if (!id) {
  console.error('usage: node tools/e2e_one.mjs <toolId>');
  process.exit(2);
}
const cmd = findCommand(id);
if (!cmd || cmd.kind !== 'read') {
  console.error(`unknown or non-read tool: ${id}`);
  process.exit(2);
}
const args = id === 'ip_ping' || id === 'ip_tracert' ? { host: '8.8.8.8' } : {};

function loadPassed() {
  try {
    return new Set(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
  } catch {
    return new Set();
  }
}
function savePassed(set) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify([...set].sort(), null, 2) + '\n');
}

const passed = loadPassed();
if (passed.has(id)) {
  console.log(`SKIP  ${id} (already passed)`);
  process.exit(0);
}

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  cwd,
});
const client = new Client({ name: 'vigor3912s-e2e-one', version: '0.0.1' });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const registered = new Set(tools.tools.map((t) => t.name));
  if (!registered.has(id)) {
    console.error(`FAIL  ${id}  (tool not registered by server)`);
    process.exit(1);
  }
  const res = await client.callTool({ name: id, arguments: args });
  const r = res;
  const content = r.content ?? r.toolResult?.content;
  const text = content?.find((c) => c.type === 'text')?.text ?? '';
  const ok = text.length > 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  (${text.length} chars)`);
  if (ok) {
    passed.add(id);
    savePassed(passed);
  }
  await client.close();
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error(`FAIL  ${id}  ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}