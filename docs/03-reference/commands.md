# Command registry

Every command in the registry becomes an MCP tool. Generated from
`src/commands/registry/` — do not edit generated docs by hand; run
`node tools/gen-commands.mjs`.

**Totals:** 217 commands · 108 read · 109 write · 42 families

## Families

- **show** — Status and diagnostics views (read-only).
- **sys** — System-level commands (mix of read and write).
- **wan** — WAN interface configuration and status.
- **srv** — DHCP and NAT services.
- **ip** — IP, routing, ARP, diagnostics.
- **mngt** — Management/access control (write).
- **linux** — 3912S Linux application (Ubuntu container) management.
- **port** — Ethernet port settings.
- **ddns** — Dynamic DNS.
- **ipf** — IP filter (firewall).
- **vpn** — VPN configuration (mostly write).
- **qos** — QoS configuration (write).
- **dos** — DoS defense.
- **internet** — Internet access profile (WAN setup).
- **ha** — High availability.
- **vrrp** — VRRP.
- **vigbrg** — Vigor bridge.
- **vlan** — VLAN configuration.
- **switch** — Switch management.
- **apm** — AP management.
- **dpdk** — DPDK (data plane) diagnostics.
- **nand** — NAND storage diagnostics.
- **usb** — USB storage.
- **hsportal** — Hotspot portal.
- **log** — Log viewing.
- **fs** — Router file system.
- **object** — Objects (IP/service/keyword groups).
- **radius** — RADIUS AAA.
- **local_8021x** — Local 802.1X.
- **user** — User management.
- **upnp** — UPnP.
- **wol** — Wake-on-LAN.
- **appqos** — Application QoS.
- **service** — MyVigor service.
- **csm** — Content security management.
- **msubnet** — Multi-subnet LAN.
- **testmail** — Mail alert test.
- **ip6** — IPv6 addressing and diagnostics.
- **ldap** — LDAP AAA.
- **tacacsplus** — TACACS+ AAA.
- **portmaptime** — Port mapping session timeouts.
- **swm** — Switch/AP management service.

## Commands

| Tool | Kind | Family | Dangerous | Affects network | Args | Snapshot read | Secret args | Skip commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `show_status` | read | show |  |  | - | - | - |  |
| `show_lan` | read | show |  |  | - | - | - |  |
| `show_dmz` | read | show |  |  | - | - | - |  |
| `show_dns` | read | show |  |  | - | - | - |  |
| `show_openport` | read | show |  |  | - | - | - |  |
| `show_nat` | read | show |  |  | - | - | - |  |
| `show_portmap` | read | show |  |  | - | - | - |  |
| `show_pmtime` | read | show |  |  | - | - | - |  |
| `show_session` | read | show |  |  | - | - | - |  |
| `show_traffic` | read | show |  |  | - | - | - |  |
| `show_clienttraffic` | read | show |  |  | - | - | - |  |
| `show_cpu` | read | show |  |  | - | - | - |  |
| `show_memory` | read | show |  |  | - | - | - |  |
| `show_cocpu` | read | show |  |  | - | - | - |  |
| `show_cputemp` | read | show |  |  | - | - | - |  |
| `show_statistic` | read | show |  |  | - | - | - |  |
| `show_flow` | read | show |  |  | - | - | - |  |
| `show_voip` | read | show |  |  | - | - | - |  |
| `show_qryrdsl` | read | show |  |  | - | - | - |  |
| `sys_version` | read | sys |  |  | - | - | - |  |
| `sys_cmdlog` | read | sys |  |  | - | - | - |  |
| `sys_cc` | read | sys |  |  | - | - | - |  |
| `sys_qrybuf` | read | sys |  |  | - | - | - |  |
| `sys_pollbuf` | read | sys |  |  | - | - | - |  |
| `sys_health` | read | sys |  |  | - | - | - |  |
| `sys_info` | read | sys |  |  | - | - | - |  |
| `sys_fr_log` | read | sys |  |  | - | - | - |  |
| `sys_max_session` | read | sys |  |  | - | - | - |  |
| `sys_app_statistic` | read | sys |  |  | - | - | - |  |
| `sys_app_bandwidth` | read | sys |  |  | - | - | - |  |
| `sys_time` | read | sys |  |  | - | - | - |  |
| `sys_dnsCacheTbl` | read | sys |  |  | - | - | - |  |
| `sys_dashboard` | read | sys |  |  | - | - | - |  |
| `sys_passwd` | write | sys | yes |  | old, new | - | old, new |  |
| `sys_name` | write | sys |  |  | name | - | - |  |
| `sys_domainname` | write | sys |  |  | domain | - | - |  |
| `sys_commit` | write | sys |  |  | - | - | - | yes |
| `sys_reboot` | write | sys | yes | yes | - | - | - | yes |
| `sys_autoreboot` | write | sys |  |  | mode, hours | - | - |  |
| `sys_tftpd` | write | sys | yes |  | onoff | - | - |  |
| `sys_syslog` | write | sys |  |  | onoff | - | - |  |
| `sys_mailalert` | write | sys |  |  | onoff | - | - |  |
| `sys_webhook` | write | sys |  |  | onoff | - | - |  |
| `sys_tr069` | write | sys |  |  | onoff | - | - |  |
| `sys_alg` | write | sys |  |  | onoff | - | - |  |
| `sys_license` | write | sys |  |  | action | - | - |  |
| `wan_status` | read | wan |  |  | - | - | - |  |
| `wan_detect` | read | wan |  |  | - | - | - |  |
| `wan_detect_mtu` | read | wan |  |  | - | - | - |  |
| `wan_detect_mtu6` | read | wan |  |  | - | - | - |  |
| `wan_enable` | write | wan | yes | yes | wan | wan_status | - |  |
| `wan_disable` | write | wan | yes | yes | wan | wan_status | - |  |
| `wan_mtu` | write | wan |  |  | wan, mtu | - | - |  |
| `wan_dns` | write | wan |  |  | wan, primary, secondary | - | - |  |
| `wan_forward` | write | wan |  |  | onoff | - | - |  |
| `wan_failover` | write | wan |  |  | param | - | - |  |
| `wan_lb` | write | wan |  |  | param | - | - |  |
| `wan_budget` | write | wan |  |  | param | - | - |  |
| `wan_vlan` | write | wan |  |  | wan, vid | - | - |  |
| `dhcp_status` | read | srv |  |  | - | - | - |  |
| `nat_view` | read | srv |  |  | - | - | - |  |
| `dhcp_on` | write | srv | yes | yes | - | - | - |  |
| `dhcp_off` | write | srv | yes | yes | - | - | - |  |
| `dhcp_startip` | write | srv |  | yes | lan, start, count | dhcp_status | - |  |
| `dhcp_gateway` | write | srv |  | yes | lan, gateway | dhcp_status | - |  |
| `dhcp_dns1` | write | srv |  |  | lan, dns | - | - |  |
| `dhcp_dns2` | write | srv |  |  | lan, dns | - | - |  |
| `dhcp_leasetime` | write | srv |  |  | lan, seconds | - | - |  |
| `nat_dmz` | write | srv | yes | yes | lan, host | show_dmz | - |  |
| `ip_route_status` | read | ip |  |  | - | - | - |  |
| `ip_arp_status` | read | ip |  |  | - | - | - |  |
| `ip_ping` | read | ip |  |  | host | - | - |  |
| `ip_tracert` | read | ip |  |  | host | - | - |  |
| `ip_session` | read | ip |  |  | - | - | - |  |
| `ip_dnsforward` | read | ip |  |  | - | - | - |  |
| `ip_lanDNSRes` | read | ip |  |  | - | - | - |  |
| `ip_addr` | write | ip | yes | yes | lan, ip | show_lan | - |  |
| `ip_nmask` | write | ip | yes | yes | lan, mask | show_lan | - |  |
| `ip_route_add` | write | ip |  | yes | dest, mask, gw | ip_route_status | - |  |
| `ip_route_del` | write | ip |  | yes | dest, mask | ip_route_status | - |  |
| `ip_bindmac` | write | ip |  |  | ip, mac | - | - |  |
| `mngt_sshport` | write | mngt | yes |  | port | - | - |  |
| `mngt_telnetport` | write | mngt | yes |  | port | - | - |  |
| `mngt_httpport` | write | mngt | yes |  | port | - | - |  |
| `mngt_httpsport` | write | mngt | yes |  | port | - | - |  |
| `mngt_sshtimeout` | write | mngt |  |  | minutes | - | - |  |
| `mngt_telnettimeout` | write | mngt |  |  | minutes | - | - |  |
| `mngt_noping` | write | mngt |  |  | onoff | - | - |  |
| `mngt_defenseworm` | write | mngt |  |  | onoff | - | - |  |
| `mngt_bfp` | write | mngt | yes |  | onoff | - | - |  |
| `linux_status` | read | linux |  |  | - | - | - |  |
| `linux_ssh_enable` | write | linux |  |  | - | - | - |  |
| `linux_ssh_disable` | write | linux |  |  | - | - | - |  |
| `linux_ssh_port` | write | linux |  |  | port | - | - |  |
| `linux_setlinuxip` | write | linux | yes | yes | ip, cidr, gateway | - | - |  |
| `port_status` | read | port |  |  | - | - | - |  |
| `port_sniff_status` | read | port |  |  | - | - | - |  |
| `port_speed` | write | port |  | yes | port, speed | - | - |  |
| `ddns_show` | read | ddns |  |  | - | - | - |  |
| `ddns_log` | read | ddns |  |  | - | - | - |  |
| `ddns_enable` | write | ddns |  |  | onoff | - | - |  |
| `ddns_forceupdate` | write | ddns |  |  | - | - | - |  |
| `ipf_view` | read | ipf |  |  | - | - | - |  |
| `ipf_set` | write | ipf | yes |  | param | - | - |  |
| `ipf_rule` | write | ipf | yes |  | param | - | - |  |
| `vpn_list` | read | vpn |  |  | - | - | - |  |
| `vpn_remote` | read | vpn |  |  | - | - | - |  |
| `vpn_graph` | read | vpn |  |  | - | - | - |  |
| `vpn_setup` | write | vpn |  | yes | index, param | - | param |  |
| `vpn_ovpn` | write | vpn |  | yes | param | - | param |  |
| `vpn_dial_out` | write | vpn |  | yes | param | - | - |  |
| `qos_setup` | write | qos |  | yes | param | - | - |  |
| `qos_class` | write | qos |  | yes | param | - | - |  |
| `dos_view` | read | dos |  |  | - | - | - |  |
| `dos_blacklist_show` | read | dos |  |  | - | - | - |  |
| `dos_whitelist_show` | read | dos |  |  | - | - | - |  |
| `dos_activate` | write | dos |  | yes | - | - | - |  |
| `dos_deactivate` | write | dos | yes | yes | - | - | - |  |
| `internet_view` | read | internet |  |  | - | - | - |  |
| `internet_set` | write | internet | yes | yes | wan, mode, username, password | - | password |  |
| `ha_show` | read | ha |  |  | - | - | - |  |
| `ha_status` | read | ha |  |  | - | - | - |  |
| `ha_set` | write | ha | yes | yes | param | - | - |  |
| `vrrp_show` | read | vrrp |  |  | - | - | - |  |
| `vrrp_enable` | write | vrrp | yes | yes | onoff | - | - |  |
| `vrrp_set` | write | vrrp |  | yes | param | - | - |  |
| `vrrp_apply` | write | vrrp |  |  | - | - | - |  |
| `vrrp_reset` | write | vrrp |  |  | - | - | - |  |
| `vigbrg_status` | read | vigbrg |  |  | - | - | - |  |
| `vigbrg_wanstatus` | read | vigbrg |  |  | - | - | - |  |
| `vigbrg_wlanstatus` | read | vigbrg |  |  | - | - | - |  |
| `vigbrg_set` | write | vigbrg |  | yes | param | - | - |  |
| `vlan_status` | read | vlan |  |  | - | - | - |  |
| `vlan_on` | write | vlan | yes | yes | - | vlan_status | - |  |
| `vlan_off` | write | vlan | yes | yes | - | vlan_status | - |  |
| `vlan_group` | write | vlan |  | yes | param | vlan_status | - |  |
| `switch_status` | read | switch |  |  | - | - | - |  |
| `switch_list` | read | switch |  |  | - | - | - |  |
| `switch_query` | read | switch |  |  | - | - | - |  |
| `switch_on` | write | switch |  |  | param | - | - |  |
| `switch_off` | write | switch |  |  | param | - | - |  |
| `apm_show` | read | apm |  |  | - | - | - |  |
| `apm_query` | read | apm |  |  | - | - | - |  |
| `apm_stanum` | read | apm |  |  | - | - | - |  |
| `apm_enable` | write | apm |  |  | - | - | - |  |
| `apm_disable` | write | apm |  |  | - | - | - |  |
| `dpdk_statistic` | read | dpdk |  |  | - | - | - |  |
| `dpdk_cmdlog` | read | dpdk |  |  | - | - | - |  |
| `nand_usage` | read | nand |  |  | - | - | - |  |
| `nand_bad` | read | nand |  |  | - | - | - |  |
| `usb_devstat` | read | usb |  |  | - | - | - |  |
| `usb_disk` | read | usb |  |  | - | - | - |  |
| `usb_temp` | read | usb |  |  | - | - | - |  |
| `hsportal_info` | read | hsportal |  |  | - | - | - |  |
| `hsportal_level` | read | hsportal |  |  | - | - | - |  |
| `hsportal_setup` | write | hsportal |  |  | param | - | param |  |
| `log_tail` | read | log |  |  | - | - | - |  |
| `log_call` | read | log |  |  | - | - | - |  |
| `log_filter` | read | log |  |  | - | - | - |  |
| `log_wan` | read | log |  |  | - | - | - |  |
| `log_ppp` | read | log |  |  | - | - | - |  |
| `fs_ls` | read | fs |  |  | - | - | - |  |
| `fs_info` | read | fs |  |  | - | - | - |  |
| `fs_pwd` | read | fs |  |  | - | - | - |  |
| `object_ip_view` | read | object |  |  | - | - | - |  |
| `object_service_view` | read | object |  |  | - | - | - |  |
| `radius_show` | read | radius |  |  | - | - | - |  |
| `radius_show_local_cer` | read | radius |  |  | - | - | - |  |
| `local8021x_show` | read | local_8021x |  |  | - | - | - |  |
| `local8021x_show_local_cer` | read | local_8021x |  |  | - | - | - |  |
| `user_account` | write | user | yes |  | param | - | param |  |
| `user_edit` | write | user |  |  | param | - | param |  |
| `user_set` | write | user |  |  | param | - | - |  |
| `user_setdefault` | write | user | yes |  | - | - | - |  |
| `upnp_on` | write | upnp |  | yes | - | - | - |  |
| `upnp_off` | write | upnp |  | yes | - | - | - |  |
| `upnp_nat` | read | upnp |  |  | - | - | - |  |
| `wol_send` | write | wol |  |  | mac | - | - | yes |
| `appqos_view` | read | appqos |  |  | - | - | - |  |
| `appqos_enable` | write | appqos |  |  | mode | - | - |  |
| `service_show` | read | service |  |  | - | - | - |  |
| `service_get` | read | service |  |  | - | - | - |  |
| `csm_appe_show` | read | csm |  |  | - | - | - |  |
| `csm_appe_set` | write | csm |  |  | param | - | - |  |
| `csm_ucf` | write | csm |  |  | param | - | - |  |
| `csm_wcf` | write | csm |  |  | param | - | - |  |
| `csm_dnsf` | write | csm |  |  | param | - | - |  |
| `msubnet_status` | read | msubnet |  |  | - | - | - |  |
| `msubnet_switch` | write | msubnet | yes | yes | onoff | - | - |  |
| `testmail_send` | write | testmail |  |  | - | - | - | yes |
| `ip6_ping` | read | ip6 |  |  | host | - | - |  |
| `ip6_tracert` | read | ip6 |  |  | host | - | - |  |
| `ip6_addr` | write | ip6 |  | yes | param | - | - |  |
| `ip6_mngt` | write | ip6 |  |  | proto, onoff | - | - |  |
| `ldap_view` | read | ldap |  |  | - | - | - |  |
| `ldap_set` | write | ldap |  |  | param | - | param |  |
| `ldap_user` | write | ldap |  |  | param | - | param |  |
| `tacacsplus_view` | read | tacacsplus |  |  | - | - | - |  |
| `tacacsplus_set` | write | tacacsplus |  |  | param | - | param |  |
| `portmaptime_list` | read | portmaptime |  |  | - | - | - |  |
| `portmaptime_set` | write | portmaptime |  |  | proto, seconds | - | - |  |
| `portmaptime_flush` | write | portmaptime |  | yes | - | - | - |  |
| `swm_show` | read | swm |  |  | - | - | - |  |
| `swm_get` | read | swm |  |  | - | - | - |  |
| `swm_enable` | write | swm |  |  | - | - | - |  |
| `swm_disable` | write | swm |  |  | - | - | - |  |
| `swm_post` | write | swm |  |  | param | - | - |  |
| `swm_group` | write | swm |  |  | param | - | - |  |
| `swm_profile` | write | swm |  |  | param | - | - |  |
| `swm_detail` | write | swm |  |  | param | - | - |  |
| `swm_maintain` | write | swm |  |  | param | - | - |  |
| `swm_search` | write | swm |  |  | param | - | - |  |
| `swm_db` | write | swm |  |  | param | - | - |  |
| `swm_alert` | write | swm |  |  | param | - | - |  |
| `swm_log` | write | swm |  |  | param | - | - |  |
| `swm_snmp` | write | swm |  |  | param | - | - |  |
| `swm_tr069` | write | swm |  |  | param | - | - |  |

### Legend

- **Kind**: `read` runs freely (verified view/status/display command);
  `write` requires the two-step confirm gate.
- **Dangerous**: requires `acknowledge: true` on the confirm call (can drop
  connectivity, lock out management, or reboot).
- **Affects network**: extra warning shown in the preview.
- **Args**: tool argument names (validated by zod).
- **Snapshot read**: a read tool run before/after the write to capture the
  router state in the audit log.
- **Secret args**: values redacted to `***` in logs.
- **Skip commit**: no auto `sys commit` after this write.
