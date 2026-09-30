/**
 * MCP confirm / session policy for curated tools.
 *
 * Layer 1 (session): `CommandDef.kind` — `read` | `write` (plus config `readOnly`).
 * Layer 2 (confirm tier): how hard the MCP gate is before a write may run.
 *
 * SDK classification (`read` / `write` / `destructive`) is metadata only; this
 * file owns AI/ops confirmation UX.
 */

import { operationFor } from '../sdk/operation-index.js';

export type ConfirmTier = 'auto' | 'confirm' | 'dual';

export interface WritePolicy {
  /**
   * Confirm tier for this write tool.
   * - `auto` — reads only; write tools that set this are coerced to `confirm`
   * - `confirm` — preview + Ed25519 signature (default writes)
   * - `dual` — signature + explicit `acknowledge: true`
   */
  confirm?: ConfirmTier;
  /** Preview warns that the change affects network connectivity. */
  affectsNetwork?: boolean;
  /** Arg keys redacted to *** in logs and previews. */
  secretArgs?: string[];
  /** Read tool id used for before/after write_audit snapshots. */
  snapshotRead?: string;
  /** Skip auto `sys commit` after a successful write. */
  skipCommit?: boolean;
}

export const READ_POLICY: Readonly<Record<string, { sensitiveOutput?: true }>> = {
  ddns_show: { sensitiveOutput: true },
  ddns_show_all: { sensitiveOutput: true },
  radius_show: { sensitiveOutput: true },
  radius_external_view: { sensitiveOutput: true },
  radius_external_viewprofile: { sensitiveOutput: true },
  ldap_view: { sensitiveOutput: true },
  tacacsplus_view: { sensitiveOutput: true },
  vpn_wg_show: { sensitiveOutput: true },
  usb_user_list: { sensitiveOutput: true },
  csm_appe_config: { sensitiveOutput: true },
  ip_ospf_cfg_show: { sensitiveOutput: true },
  mngt_rmtcfg_status: { sensitiveOutput: true },
  sys_cfg_status: { sensitiveOutput: true },
};

/** Resolved policy fields merged onto CommandDef. */
export interface ResolvedToolPolicy {
  confirm: ConfirmTier;
  affectsNetwork?: boolean;
  secretArgs?: string[];
  snapshotRead?: string;
  skipCommit?: boolean;
  sensitiveOutput?: boolean;
}

export function resolveConfirmTier(
  kind: 'read' | 'write',
  policy: WritePolicy | undefined,
  sdkClassification?: string,
): ConfirmTier {
  if (kind === 'read') return 'auto';
  // Writes never skip the signature gate via `auto`.
  if (policy?.confirm === 'dual' || sdkClassification === 'destructive') return 'dual';
  return 'confirm';
}

/**
 * Explicit per-tool policy. Missing write ids default to `confirm`.
 * Prefer listing lockout and secret-bearing tools here over burying flags
 * inside W(...) in the registry.
 */
export const WRITE_POLICY: Readonly<Record<string, WritePolicy>> = {
  // --- sys ---
  sys_passwd: { confirm: 'dual', secretArgs: ['old', 'new'] },
  sys_commit: { skipCommit: true },
  sys_reboot: { confirm: 'dual', affectsNetwork: true, skipCommit: true },
  sys_tftpd: { confirm: 'dual' },

  // --- wan ---
  wan_enable: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'wan_status' },
  wan_disable: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'wan_status' },

  // --- dhcp / nat ---
  dhcp_on: { confirm: 'dual', affectsNetwork: true },
  dhcp_off: { confirm: 'dual', affectsNetwork: true },
  dhcp_startip: { affectsNetwork: true, snapshotRead: 'dhcp_status' },
  dhcp_gateway: { affectsNetwork: true, snapshotRead: 'dhcp_status' },
  nat_dmz: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'show_dmz' },

  // --- ip / routing (LAN IP/mask changes can lock out management) ---
  ip_addr: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'show_lan' },
  ip_nmask: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'show_lan' },
  ip_route_add: { affectsNetwork: true, snapshotRead: 'ip_route_status' },
  ip_route_del: { affectsNetwork: true, snapshotRead: 'ip_route_status' },
  ip_bgp: { secretArgs: ['key'] },

  // --- management ports / hardening ---
  mngt_sshport: { confirm: 'dual' },
  mngt_telnetport: { confirm: 'dual' },
  mngt_httpport: { confirm: 'dual' },
  mngt_httpsport: { confirm: 'dual' },
  mngt_bfp: { confirm: 'dual' },

  // --- linux app ---
  linux_setlinuxip: { confirm: 'dual', affectsNetwork: true, secretArgs: ['password'] },
  sdk_linux_setlinuxip: { secretArgs: ['password'] },

  // --- ports / firewall ---
  port_speed: { affectsNetwork: true },
  ipf_set: { confirm: 'dual' },
  ipf_rule: { confirm: 'dual' },
  ipf_flowtrack_set: { confirm: 'dual' },

  // --- CSM / SWM (credentials + disruptive maintain) ---
  swm_group: { secretArgs: ['password'] },
  swm_detail: { secretArgs: ['password'] },
  swm_maintain: { confirm: 'dual' },

  // --- vpn / qos / dos ---
  hsportal_setup: { secretArgs: ['appKey', 'appId'] },
  ldap_set: { secretArgs: ['value'] },
  tacacsplus_set: { secretArgs: ['secret'] },
  ddns_set: { secretArgs: ['password'] },
  ddns_set_update: { secretArgs: ['password'] },
  mngt_certimport: { secretArgs: ['password'] },
  radius_client_add: { secretArgs: ['secret'] },
  service_login: { secretArgs: ['password'] },
  sys_adminuser: { secretArgs: ['password'] },
  vpn_setup: { affectsNetwork: true, secretArgs: ['param'] },
  vpn_ovpn: { affectsNetwork: true, secretArgs: ['param'] },
  vpn_wg_keyset: { confirm: 'dual', secretArgs: ['privateKey'] },
  vpn_dial_out: { affectsNetwork: true },
  qos_setup: { affectsNetwork: true },
  qos_class: { affectsNetwork: true },
  qos_type: { affectsNetwork: true },
  qos_voip: { affectsNetwork: true },
  dos_activate: { affectsNetwork: true },
  dos_deactivate: { confirm: 'dual', affectsNetwork: true },

  // --- internet / HA / VRRP / bridge / vlan ---
  internet_set: { confirm: 'dual', affectsNetwork: true, secretArgs: ['password'] },
  internet: { secretArgs: ['password'] },
  ip6_internet: { secretArgs: ['password'] },
  ha_set: { confirm: 'dual', affectsNetwork: true },
  vrrp_enable: { confirm: 'dual', affectsNetwork: true },
  vrrp_set: { affectsNetwork: true },
  vigbrg_set: { affectsNetwork: true },
  vlan_on: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'vlan_status' },
  vlan_off: { confirm: 'dual', affectsNetwork: true, snapshotRead: 'vlan_status' },
  vlan_group: { affectsNetwork: true, snapshotRead: 'vlan_status' },

  // --- upnp / wol / mail ---
  upnp_on: { affectsNetwork: true },
  upnp_off: { affectsNetwork: true },
  wol_send: { skipCommit: true },
  testmail_send: { skipCommit: true },

  // --- user / directory (credentials often in free-form param) ---
  user_account: { confirm: 'dual', secretArgs: ['param', 'userName'] },
  user_edit: { secretArgs: ['param'] },
  user_set: { secretArgs: ['param'] },
  user: { secretArgs: ['param', 'userName'] },
  user_setdefault: { confirm: 'dual' },

  // --- misc network ---
  msubnet_switch: { confirm: 'dual', affectsNetwork: true },
  ip6_addr: { affectsNetwork: true },
  portmaptime_flush: { affectsNetwork: true },
};

export function applyToolPolicy<T extends { id: string; kind: string }>(
  cmd: T,
): T & ResolvedToolPolicy {
  const kind = cmd.kind === 'write' ? 'write' : 'read';
  const policy = kind === 'write' ? WRITE_POLICY[cmd.id] : undefined;
  const readPolicy = kind === 'read' ? READ_POLICY[cmd.id] : undefined;
  const sdk = 'sdk' in cmd && cmd.sdk && typeof cmd.sdk === 'object' ? cmd.sdk : undefined;
  const manifestId = sdk && 'manifestId' in sdk && typeof sdk.manifestId === 'string'
    ? sdk.manifestId
    : undefined;
  const sdkClassification = manifestId ? operationFor(manifestId)?.classification : undefined;
  const confirm = resolveConfirmTier(kind, policy, sdkClassification);
  const { confirm: _c, secretArgs: policySecretArgs, ...rest } = policy ?? {};
  const currentSecretArgs =
    'secretArgs' in cmd && Array.isArray(cmd.secretArgs) ? cmd.secretArgs : [];
  const secretArgs = [...new Set([...currentSecretArgs, ...(policySecretArgs ?? [])])];
  return {
    ...cmd,
    ...rest,
    ...(secretArgs.length > 0 ? { secretArgs } : {}),
    ...(readPolicy?.sensitiveOutput ? { sensitiveOutput: true } : {}),
    confirm,
  };
}
