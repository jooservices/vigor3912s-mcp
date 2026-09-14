/**
 * Write-tool safety policy, separate from the CLI catalog in registry/.
 *
 * Merged onto write CommandDefs by allCommands() / findCommand().
 * Registry entries only describe id / render / args / desc.
 */

export interface WritePolicy {
  /** Preview warns that the change affects network connectivity. */
  affectsNetwork?: boolean;
  /** Confirm alone is not enough — caller must pass acknowledge: true. */
  dangerous?: boolean;
  /** Arg keys redacted to *** in logs and previews. */
  secretArgs?: string[];
  /** Read tool id used for before/after write_audit snapshots. */
  snapshotRead?: string;
  /** Skip auto `sys commit` after a successful write. */
  skipCommit?: boolean;
}

/**
 * Explicit per-tool policy. Missing ids get defaults (all false / empty).
 * Prefer listing lockout and secret-bearing tools here over burying flags
 * inside W(...) in the registry.
 */
export const WRITE_POLICY: Readonly<Record<string, WritePolicy>> = {
  // --- sys ---
  sys_passwd: { dangerous: true, secretArgs: ['old', 'new'] },
  sys_commit: { skipCommit: true },
  sys_reboot: { affectsNetwork: true, dangerous: true, skipCommit: true },
  sys_tftpd: { dangerous: true },

  // --- wan ---
  wan_enable: { affectsNetwork: true, dangerous: true, snapshotRead: 'wan_status' },
  wan_disable: { affectsNetwork: true, dangerous: true, snapshotRead: 'wan_status' },

  // --- dhcp / nat ---
  dhcp_on: { affectsNetwork: true, dangerous: true },
  dhcp_off: { affectsNetwork: true, dangerous: true },
  dhcp_startip: { affectsNetwork: true, snapshotRead: 'dhcp_status' },
  dhcp_gateway: { affectsNetwork: true, snapshotRead: 'dhcp_status' },
  nat_dmz: { affectsNetwork: true, dangerous: true, snapshotRead: 'show_dmz' },

  // --- ip / routing (LAN IP/mask changes can lock out management) ---
  ip_addr: { affectsNetwork: true, dangerous: true, snapshotRead: 'show_lan' },
  ip_nmask: { affectsNetwork: true, dangerous: true, snapshotRead: 'show_lan' },
  ip_route_add: { affectsNetwork: true, snapshotRead: 'ip_route_status' },
  ip_route_del: { affectsNetwork: true, snapshotRead: 'ip_route_status' },

  // --- management ports / hardening ---
  mngt_sshport: { dangerous: true },
  mngt_telnetport: { dangerous: true },
  mngt_httpport: { dangerous: true },
  mngt_httpsport: { dangerous: true },
  mngt_bfp: { dangerous: true },

  // --- linux app ---
  linux_setlinuxip: { affectsNetwork: true, dangerous: true },

  // --- ports / firewall ---
  port_speed: { affectsNetwork: true },
  ipf_set: { dangerous: true },
  ipf_rule: { dangerous: true },

  // --- vpn / qos / dos ---
  vpn_setup: { affectsNetwork: true, secretArgs: ['param'] },
  vpn_ovpn: { affectsNetwork: true, secretArgs: ['param'] },
  vpn_dial_out: { affectsNetwork: true },
  qos_setup: { affectsNetwork: true },
  qos_class: { affectsNetwork: true },
  dos_activate: { affectsNetwork: true },
  dos_deactivate: { affectsNetwork: true, dangerous: true },

  // --- internet / HA / VRRP / bridge / vlan ---
  internet_set: { affectsNetwork: true, dangerous: true, secretArgs: ['password'] },
  ha_set: { affectsNetwork: true, dangerous: true },
  vrrp_enable: { affectsNetwork: true, dangerous: true },
  vrrp_set: { affectsNetwork: true },
  vigbrg_set: { affectsNetwork: true },
  vlan_on: { affectsNetwork: true, dangerous: true, snapshotRead: 'vlan_status' },
  vlan_off: { affectsNetwork: true, dangerous: true, snapshotRead: 'vlan_status' },
  vlan_group: { affectsNetwork: true, snapshotRead: 'vlan_status' },

  // --- upnp / wol / mail ---
  upnp_on: { affectsNetwork: true },
  upnp_off: { affectsNetwork: true },
  wol_send: { skipCommit: true },
  testmail_send: { skipCommit: true },

  // --- user / directory (credentials often in free-form param) ---
  user_account: { secretArgs: ['param'], dangerous: true },
  user_edit: { secretArgs: ['param'] },
  user_setdefault: { dangerous: true },
  hsportal_setup: { secretArgs: ['param'] },
  ldap_set: { secretArgs: ['param'] },
  ldap_user: { secretArgs: ['param'] },
  tacacsplus_set: { secretArgs: ['param'] },

  // --- misc network ---
  msubnet_switch: { affectsNetwork: true, dangerous: true },
  ip6_addr: { affectsNetwork: true },
  portmaptime_flush: { affectsNetwork: true },
};

export function applyWritePolicy<T extends { id: string; kind: string }>(
  cmd: T,
): T & WritePolicy {
  if (cmd.kind !== 'write') return cmd;
  const policy = WRITE_POLICY[cmd.id];
  if (!policy) return cmd;
  return { ...cmd, ...policy };
}
