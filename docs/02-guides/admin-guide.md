# Admin guide

Common administration tasks you can do through the MCP tools. Every write below
goes through the confirm gate; commands marked **dangerous** also need
`acknowledge: true`.

> Note: full config backup/restore is only available via the router WebUI
> (`System Maintenance >> Configuration Backup`). Take a WebUI backup before
> risky operations.

## WAN

| Task | Tool | Args |
| --- | --- | --- |
| View all WAN links | `wan_status` | — |
| Enable a WAN | `wan_enable` ⚠ | `{ wan: 1..12 }` |
| Disable a WAN | `wan_disable` ⚠ | `{ wan: 1..12 }` |
| Set WAN MTU | `wan_mtu` ⚠ | `{ wan, mtu }` |
| Set WAN DNS | `wan_dns` | `{ wan, primary, secondary? }` |
| WAN internet mode / ISP Name | `internet_set` ⚠ | `{ wan, mode, ispName?, username?, password? }` |

⚠ = dangerous (requires acknowledge).

## DHCP & LAN

| Task | Tool | Args |
| --- | --- | --- |
| DHCP leases + server status | `dhcp_status` | — |
| Enable/disable DHCP | `dhcp_on` / `dhcp_off` ⚠ | — (reboot to apply) |
| DHCP start IP + pool | `dhcp_startip` | `{ lan, start, count }` |
| DHCP gateway | `dhcp_gateway` | `{ lan, gateway }` |
| DHCP DNS | `dhcp_dns1` / `dhcp_dns2` | `{ lan, dns }` |
| DHCP lease time | `dhcp_leasetime` | `{ lan, seconds }` |
| LAN IP / netmask | `ip_addr` / `ip_nmask` ⚠ | `{ lan, ip }` / `{ lan, mask }` |

## Routing & ARP

| Task | Tool | Args |
| --- | --- | --- |
| Routing table | `ip_route_status` | — |
| ARP table | `ip_arp_status` | — |
| Add static route | `ip_route_add` ⚠ | `{ dest, mask, gw }` |
| Delete static route | `ip_route_del` ⚠ | `{ dest, mask }` |
| Bind IP↔MAC | `ip_bindmac` | `{ ip, mac }` |

## Diagnostics

| Task | Tool | Args |
| --- | --- | --- |
| Ping | `ip_ping` | `{ host }` (5 packets) |
| Traceroute | `ip_tracert` | `{ host }` |
| Sessions | `show_session` | — |
| CPU / memory | `show_cpu` / `show_memory` | — |
| NAT table | `show_nat` | — |
| Port mapping | `show_portmap` | — |

## Management & security

| Task | Tool | Args |
| --- | --- | --- |
| Change admin password | `sys_passwd` ⚠ | `{ old, new }` |
| Router name | `sys_name` | `{ name }` |
| SSH port | `mngt_sshport` ⚠ | `{ port }` |
| Brute-force protection | `mngt_bfp` | `{ onoff }` |
| Save settings (manual) | `sys_commit` | — |

## Firewall & VPN

| Task | Tool | Args |
| --- | --- | --- |
| IP filter view | `ipf_view` | — |
| VPN list / remote users | `vpn_list` / `vpn_remote` | — |
| VPN profile setup | `vpn_setup` ⚠ | `{ index, param }` |

## Linux application (3912S)

| Task | Tool | Args |
| --- | --- | --- |
| Linux app status | `linux_status` | — |
| Enable SSH to Linux env | `linux_ssh_enable` | — |
| Set Linux app IP | `linux_setlinuxip` ⚠ | `{ ip, cidr, gateway }` |

## Safe live example — WAN ISP Name only

To rename the ISP label on WAN7 without changing mode/auth (verified live on
fw 4.4.7_RC2):

1. Read first: `internet_view` / `show_status`.
2. Write: `internet_set` with `{ wan: 7, mode: <current>, ispName: "…" }`.
3. Sign with `node tools/approve.mjs <confirmation_id>` and re-call with
   `signature` (+ `acknowledge: true` when the tier is dual).
4. Confirm with `internet_view` again.

Helpers (LAN only; never commit `.env`): `tools/e2e_wan7_ispname_*.mjs`.

## Before risky operations

1. Take a WebUI config backup.
2. Prefer read tools first (`wan_status`, `dhcp_status`, `ip_route_status`, ...).
3. Use the preview — verify the exact CLI before signing.
4. For dual / dangerous writes, accept the lockout risk (`acknowledge: true`).
5. After the change, re-check state with the read tools; the audit log in
   `data/vigor3912s.db` keeps before/after snapshots.