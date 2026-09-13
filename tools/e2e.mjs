#!/usr/bin/env node
/**
 * Unified E2E — runs against the target in `.env` (VIGOR_*) and tests exactly
 * the tools the server exposes (`EXPOSE_TOOLS`).
 *
 * Safety model:
 * - EXPOSE_TOOLS decides what can be tested. `.env.example` defaults to
 *   `EXPOSE_TOOLS=readonly`, so a local run against the real router only tests
 *   read tools. A local user who explicitly exposes write tools (and points at
 *   a real server) opts in to testing those writes.
 * - GitHub Actions brings up a simulated DrayOS server (see
 *   `tools/e2e_fake_run.mjs`) and runs with `EXPOSE_TOOLS=all`.
 * - Write tools are executed only when this script has curated argument values
 *   for them (WRITE_ARGS); otherwise writes are preview-only.
 * - Already-verified read tools are skipped via recon-output/e2e-passed.json.
 *
 * Usage:
 *   EXPOSE_TOOLS=readonly npm run e2e        # local / real server (default)
 *   npm run e2e:fake                          # CI: simulated DrayOS server, all tools
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const STATE_FILE = path.join(cwd, 'recon-output', 'e2e-passed.json');

const READ_ARGS = (id) =>
  ['ip_ping', 'ip_tracert', 'ip6_ping', 'ip6_tracert'].includes(id) ? { host: '8.8.8.8' } : {};

// Representative write tests executed against the fake server (E2E_FAKE=1).
const WRITE_ARGS = {
  wan_disable: { wan: 3 },
  wan_enable: { wan: 4 },
  dhcp_gateway: { lan: 1, gateway: '192.168.1.1' },
  ip_route_add: { dest: '10.0.0.0', mask: '255.255.255.0', gw: '192.168.1.1' },
  sys_name: { name: 'TestRouter' },
  mngt_sshport: { port: 22 },
  sys_passwd: { old: 'oldpass', new: 'newpass' },
  sys_commit: {},
  testmail_send: {},
  wol_send: { mac: '00:11:22:33:44:55' },
  internet_set: { wan: 1, mode: 0 },
  vrrp_reset: {},
  user_setdefault: {},
  dos_activate: {},
  portmaptime_set: { proto: 't', seconds: 300 },
  linux_ssh_enable: {},
  qos_setup: { param: 'limit bandwidth 1000' },
  ipf_set: { param: 'drop' },
  upnp_on: {},
  appqos_enable: { mode: 0 },
  msubnet_switch: { onoff: 'on' },
  vlan_on: {},
  vrrp_enable: { onoff: 'on' },
  csm_ucf: { param: 'block' },
  switch_on: { param: 'port1' },
};

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

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures += 1;
};
const textOf = (res) => res.content?.find((c) => c.type === 'text')?.text ?? '';
const isError = (res) => res.isError === true;

const passed = loadPassed();

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  cwd,
  env: process.env,
});
const mcp = new Client({ name: 'vigor3912s-e2e', version: '0.0.1' });

console.log(`target: ${process.env.VIGOR_HOST ?? '192.168.1.1'}:${process.env.VIGOR_PORT ?? 22}  EXPOSE_TOOLS=${process.env.EXPOSE_TOOLS ?? '(all)'}`);

try {
  await mcp.connect(transport);
  const tools = await mcp.listTools();
  const toolsById = new Map(tools.tools.map((t) => [t.name, t]));
  console.log(`server exposes ${toolsById.size} tools`);
  if (toolsById.size === 0) {
    console.log('nothing exposed — skipping');
    process.exit(0);
  }
  const exposedWrites = [...toolsById.keys()].filter((id) =>
    Object.keys(toolsById.get(id)?.inputSchema?.properties ?? {}).includes('confirm_token'),
  );
  if (exposedWrites.length > 0) {
    console.warn(`WARNING: ${exposedWrites.length} write tools are exposed — E2E will exercise confirmed writes against the target.`);
  }

  for (const [id, tool] of toolsById) {
    const inputSchema = tool.inputSchema ?? {};
    const hasArgs = Object.keys(inputSchema.properties ?? {}).length > 0;
    // read = no confirm_token in the schema; write = has confirm_token.
    const isWrite = Object.keys(inputSchema.properties ?? {}).includes('confirm_token');

    if (!isWrite) {
      if (passed.has(id)) continue;
      try {
        const res = await mcp.callTool({ name: id, arguments: READ_ARGS(id) });
        const t = textOf(res);
        check(`read:${id}`, t.length > 0, `(${t.length} chars)`);
        if (t.length > 0) passed.add(id);
      } catch (e) {
        check(`read:${id}`, false, e instanceof Error ? e.message : String(e));
      }
      continue;
    }

    // Write tool: preview (never sends anything to the target).
    const args = id in WRITE_ARGS ? WRITE_ARGS[id] : {};
    const preview = await mcp.callTool({ name: id, arguments: args });
    if (isError(preview)) {
      // The tool requires arguments we did not provide — expected for argful
      // writes; the full flow is covered when the tool is in WRITE_ARGS.
      check(`write:${id}:preview`, !(id in WRITE_ARGS), '(requires args)');
      continue;
    }
    const body = JSON.parse(textOf(preview));
    const okPreview =
      body.status === 'needs_confirmation' &&
      typeof body.confirm_token === 'string' &&
      body.preview.length > 0;
    check(`write:${id}:preview`, okPreview, body.preview ?? '(no preview)');

    // Execute only when curated argument values are available (WRITE_ARGS);
    // otherwise this write is preview-only.
    if (okPreview && id in WRITE_ARGS) {
      const ack = body.dangerous ? { acknowledge: true } : {};
      const done = await mcp.callTool({
        name: id,
        arguments: { ...args, confirm_token: body.confirm_token, ...ack },
      });
      const db = JSON.parse(textOf(done));
      check(`write:${id}:execute`, !isError(done) && db.status === 'done', `cmd=${db.command ?? ''}`);
    }
  }

  savePassed(passed);
  await mcp.close();

  console.log(failures === 0 ? '\nE2E: ALL PASS' : `\nE2E: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
} catch (e) {
  console.error('E2E ERROR:', e);
  process.exit(1);
}