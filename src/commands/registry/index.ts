import { voidOperationForCommand } from '../../sdk/void-operation-index.js';
import { applyToolPolicy } from '../tool-policy.js';
import type { CommandDef, FamilyDef } from './types.js';
import { showFamily } from './families/show.js';
import { sysFamily } from './families/sys.js';
import { wanFamily } from './families/wan.js';
import { srvFamily } from './families/srv.js';
import { ipFamily } from './families/ip.js';
import { mngtFamily } from './families/mngt.js';
import { linuxFamily } from './families/linux.js';
import { portFamily } from './families/port.js';
import { ddnsFamily } from './families/ddns.js';
import { ipfFamily } from './families/ipf.js';
import { vpnFamily } from './families/vpn.js';
import { qosFamily } from './families/qos.js';
import { dosFamily } from './families/dos.js';
import { internetFamily } from './families/internet.js';
import { haFamily } from './families/ha.js';
import { vrrpFamily } from './families/vrrp.js';
import { vigbrgFamily } from './families/vigbrg.js';
import { vlanFamily } from './families/vlan.js';
import { switchFamily } from './families/switch.js';
import { apmFamily } from './families/apm.js';
import { dpdkFamily } from './families/dpdk.js';
import { nandFamily } from './families/nand.js';
import { usbFamily } from './families/usb.js';
import { hsportalFamily } from './families/hsportal.js';
import { logFamily } from './families/log.js';
import { fsFamily } from './families/fs.js';
import { objectFamily } from './families/object.js';
import { radiusFamily } from './families/radius.js';
import { local_8021xFamily } from './families/local_8021x.js';
import { userFamily } from './families/user.js';
import { upnpFamily } from './families/upnp.js';
import { wolFamily } from './families/wol.js';
import { appqosFamily } from './families/appqos.js';
import { serviceFamily } from './families/service.js';
import { csmFamily } from './families/csm.js';
import { msubnetFamily } from './families/msubnet.js';
import { testmailFamily } from './families/testmail.js';
import { ip6Family } from './families/ip6.js';
import { ldapFamily } from './families/ldap.js';
import { tacacsplusFamily } from './families/tacacsplus.js';
import { portmaptimeFamily } from './families/portmaptime.js';
import { swmFamily } from './families/swm.js';
import { buildSdkGeneratedFamily } from './families/sdk-generated.js';

export type { CommandDef, CommandKind, FamilyDef } from './types.js';

/** Curated MCP catalog (hand-shaped args). */
const CURATED_REGISTRY: FamilyDef[] = [
  showFamily,
  sysFamily,
  wanFamily,
  srvFamily,
  ipFamily,
  mngtFamily,
  linuxFamily,
  portFamily,
  ddnsFamily,
  ipfFamily,
  vpnFamily,
  qosFamily,
  dosFamily,
  internetFamily,
  haFamily,
  vrrpFamily,
  vigbrgFamily,
  vlanFamily,
  switchFamily,
  apmFamily,
  dpdkFamily,
  nandFamily,
  usbFamily,
  hsportalFamily,
  logFamily,
  fsFamily,
  objectFamily,
  radiusFamily,
  local_8021xFamily,
  userFamily,
  upnpFamily,
  wolFamily,
  appqosFamily,
  serviceFamily,
  csmFamily,
  msubnetFamily,
  testmailFamily,
  ip6Family,
  ldapFamily,
  tacacsplusFamily,
  portmaptimeFamily,
  swmFamily,
];

/**
 * Auto-link curated zero-arg tools whose rendered CLI matches a void SDK
 * operation, so they execute via `sdk.invoke()` instead of raw `execute()`.
 * Tool ids, args, and descriptions are unchanged — only `cmd.sdk` is added.
 */
const SDK_VOID_BINDING_EXCLUSIONS = new Set(['local8021x_show_local_cer']);

function attachSdkVoidBindings(families: readonly FamilyDef[]): FamilyDef[] {
  return families.map((family) => ({
    ...family,
    commands: family.commands.map((cmd) => {
      if (cmd.sdk || SDK_VOID_BINDING_EXCLUSIONS.has(cmd.id) || Object.keys(cmd.args).length > 0) {
        return cmd;
      }
      let cli: string;
      try {
        cli = cmd.render({});
      } catch {
        return cmd;
      }
      const op = voidOperationForCommand(cli);
      if (!op) return cmd;
      return { ...cmd, sdk: { manifestId: op.manifestId } };
    }),
  }));
}

const LINKED_CURATED_REGISTRY: FamilyDef[] = attachSdkVoidBindings(CURATED_REGISTRY);

/** Full command registry: curated families + auto void SDK coverage. */
export const REGISTRY: FamilyDef[] = [
  ...LINKED_CURATED_REGISTRY,
  buildSdkGeneratedFamily(LINKED_CURATED_REGISTRY),
];

export function allCommands(): CommandDef[] {
  return REGISTRY.flatMap((f) => f.commands).map(applyToolPolicy);
}

export function readCommands(): CommandDef[] {
  return allCommands().filter((c) => c.kind === 'read');
}

export function writeCommands(): CommandDef[] {
  return allCommands().filter((c) => c.kind === 'write');
}

export function findCommand(id: string): CommandDef | undefined {
  return allCommands().find((c) => c.id === id);
}
