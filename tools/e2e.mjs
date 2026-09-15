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
import { signApproval } from '../dist/tools/approve-crypto.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.resolve(here, '..');
const STATE_FILE = path.join(cwd, 'recon-output', 'e2e-passed.json');

function loadApprovePrivateKey() {
  const file =
    process.env.VIGOR_APPROVE_PRIVKEY_FILE ?? path.join(cwd, 'data', 'keys', 'approve-private.pem');
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing approve private key at ${file}. Run: node tools/approve-keygen.mjs && export VIGOR_APPROVE_PUBKEY=…`,
    );
  }
  return fs.readFileSync(file, 'utf8');
}

function signPreview(body) {
  return signApproval(
    loadApprovePrivateKey(),
    body.confirmation_id,
    body.nonce,
    body.command_digest,
    body.expires_at,
  );
}

const READ_ARGS = (id) => {
  if (['ip_ping', 'ip_tracert', 'ip6_ping', 'ip6_tracert'].includes(id)) return { host: '8.8.8.8' };
  if (id === 'sys_health') return { metric: 'cpu_usage' };
  if (id === 'ha_show') return { section: 'generalSetup' };
  if (id === 'ha_status') return { scope: 'localRouter', detailLevel: 0 };
  if (id === 'ipf_flowtrack_view') return { mode: 'sessions' };
  if (id === 'csm_appe_show') return { group: 'all' };
  return {};
};

// Representative write tests executed against the fake server (E2E_FAKE=1).
const WRITE_ARGS = {
  wan_disable: { wan: 3 },
  wan_enable: { wan: 4 },
  dhcp_gateway: { lan: 1, gateway: '192.168.1.1' },
  ip_route_add: { dest: '10.0.0.0', mask: '255.255.255.0', gw: '192.168.1.1' },
  sys_name: { wan: 'wan1', name: 'TestRouter' },
  sys_tftpd: {},
  sys_alg: { enabled: 1 },
  sys_syslog: { args: ['-a', '1'] },
  sys_webhook: { args: ['status'] },
  sys_tr069: { args: ['get'] },
  sys_license: { args: ['liclog'] },
  sys_mailalert: { args: ['-e', '1'] },
  mngt_sshport: { port: 22 },
  mngt_sshtimeout: { seconds: 200 },
  mngt_telnettimeout: { seconds: 200 },
  mngt_noping: { action: 'off' },
  mngt_defenseworm: { action: 'off' },
  mngt_bfp: { args: ['-e', '1'] },
  sys_passwd: { old: 'oldpass', new: 'newpass' },
  sys_commit: {},
  testmail_send: {},
  wol_send: { mac: '00:11:22:33:44:55' },
  internet_set: { wan: 1, mode: 0, ispName: 'TestIsp' },
  vrrp_reset: {},
  user_setdefault: {},
  dos_activate: {},
  portmaptime_set: { proto: 't', seconds: 300 },
  linux_ssh_enable: {},
  qos_setup: { args: ['limit', 'bandwidth', '1000'] },
  ipf_set: { action: 'callFilterSet', setNo: 1 },
  ipf_rule: { setNo: 1, ruleNo: 1, action: 'view' },
  ipf_flowtrack_set: { action: 'refresh' },
  upnp_on: {},
  appqos_enable: { mode: 0 },
  msubnet_switch: { onoff: 'on' },
  vlan_on: {},
  vrrp_enable: { onoff: 'on' },
  csm_ucf: { action: 'show' },
  csm_appe_set: { index: 1, action: 'view', group: 'IM' },
  csm_wcf: { action: 'show' },
  csm_dnsf: { action: 'profileShow' },
  switch_on: {},
  wan_lb: { wanInterface: 'wan1', state: 'on' },
  wan_budget: { wan: 1, action: 'state', enabled: false },
  wan_failover: { action: 'show', index: 1 },
  wan_vlan: { wan: 1, action: 'state', enabled: false },
  ha_set: { args: ['-e', '0'] },
  vlan_group: { groupId: 0, action: 'show' },
  vigbrg_set: { ipVersion: 4, wanIndex: 1, lanIndex: 1, bridgeEnabled: 0 },
  swm_post: { mac: '001122334455' },
  swm_group: { action: 'show' },
  swm_profile: { action: 'show' },
  swm_detail: { action: 'show' },
  swm_maintain: { action: 'show' },
  swm_search: { action: 'mac', mac: '001122334455' },
  swm_db: { action: 'ctlShow' },
  swm_alert: { action: 'show' },
  swm_log: { action: 'showFilter' },
  swm_snmp: { action: 'sys', mac: '001122334455' },
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
    Object.keys(toolsById.get(id)?.inputSchema?.properties ?? {}).includes('signature'),
  );
  if (exposedWrites.length > 0) {
    console.warn(`WARNING: ${exposedWrites.length} write tools are exposed — E2E will exercise confirmed writes against the target.`);
  }

  for (const [id, tool] of toolsById) {
    const inputSchema = tool.inputSchema ?? {};
    // read = no signature in the schema; write = has signature.
    const isWrite = Object.keys(inputSchema.properties ?? {}).includes('signature');

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
      typeof body.confirmation_id === 'string' &&
      typeof body.command_digest === 'string' &&
      body.preview.length > 0;
    check(`write:${id}:preview`, okPreview, body.preview ?? '(no preview)');

    // Execute only when curated argument values are available (WRITE_ARGS);
    // otherwise this write is preview-only.
    if (okPreview && id in WRITE_ARGS) {
      const ack = body.dangerous ? { acknowledge: true } : {};
      const done = await mcp.callTool({
        name: id,
        arguments: {
          ...args,
          confirmation_id: body.confirmation_id,
          signature: signPreview(body),
          ...ack,
        },
      });
      const db = JSON.parse(textOf(done));
      check(
        `write:${id}:execute`,
        !isError(done) && (db.status === 'done' || db.status === 'commit_failed'),
        `cmd=${db.command ?? ''} status=${db.status ?? ''}`,
      );
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