import { applyWritePolicy } from '../write-policy.js';
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
import { buildSdkVoidFamily } from './families/sdk-void.js';

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

/** Full command registry: curated families + auto void SDK coverage. */
export const REGISTRY: FamilyDef[] = [...CURATED_REGISTRY, buildSdkVoidFamily(CURATED_REGISTRY)];

export function allCommands(): CommandDef[] {
  return REGISTRY.flatMap((f) => f.commands).map(applyWritePolicy);
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
