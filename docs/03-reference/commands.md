# Command registry

Every command in the registry becomes an MCP tool. Generated from
`src/commands/registry/` — do not edit generated docs by hand; run
`node tools/gen-commands.mjs`.

**Totals:** 302 commands · 150 read · 152 write · 43 families

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
- **sdk_void** — Auto-registered zero-arg SDK operations not already curated.

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
| `sys_health` | read | sys |  |  | metric | - | - |  |
| `sys_info` | read | sys |  |  | - | - | - |  |
| `sys_fr_log` | read | sys |  |  | - | - | - |  |
| `sys_max_session` | read | sys |  |  | - | - | - |  |
| `sys_app_statistic` | read | sys |  |  | - | - | - |  |
| `sys_app_bandwidth` | read | sys |  |  | - | - | - |  |
| `sys_time` | read | sys |  |  | - | - | - |  |
| `sys_dnsCacheTbl` | read | sys |  |  | - | - | - |  |
| `sys_dashboard` | read | sys |  |  | - | - | - |  |
| `sys_passwd` | write | sys | yes |  | old, new | - | old, new |  |
| `sys_name` | write | sys |  |  | wan, name | - | - |  |
| `sys_domainname` | write | sys |  |  | wan, domain | - | - |  |
| `sys_commit` | write | sys |  |  | - | - | - | yes |
| `sys_reboot` | write | sys | yes | yes | - | - | - | yes |
| `sys_autoreboot` | write | sys |  |  | mode, hours | - | - |  |
| `sys_tftpd` | write | sys | yes |  | - | - | - |  |
| `sys_syslog` | write | sys |  |  | args | - | - |  |
| `sys_mailalert` | write | sys |  |  | args | - | - |  |
| `sys_webhook` | write | sys |  |  | args | - | - |  |
| `sys_tr069` | write | sys |  |  | args | - | - |  |
| `sys_alg` | write | sys |  |  | enabled | - | - |  |
| `sys_license` | write | sys |  |  | args | - | - |  |
| `wan_status` | read | wan |  |  | - | - | - |  |
| `wan_detect` | read | wan |  |  | - | - | - |  |
| `wan_detect_mtu` | read | wan |  |  | - | - | - |  |
| `wan_detect_mtu6` | read | wan |  |  | - | - | - |  |
| `wan_enable` | write | wan | yes | yes | wan | wan_status | - |  |
| `wan_disable` | write | wan | yes | yes | wan | wan_status | - |  |
| `wan_mtu` | write | wan |  |  | wan, mtu | - | - |  |
| `wan_dns` | write | wan |  |  | wan, primary, secondary | - | - |  |
| `wan_forward` | write | wan |  |  | onoff | - | - |  |
| `wan_failover` | write | wan |  |  | action, index, failoverWan, disconnectActionEnabled, anyOrAllActionEnabled, mainWan, downloadThresholdKbps, uploadThresholdKbps | - | - |  |
| `wan_lb` | write | wan |  |  | wanInterface, state | - | - |  |
| `wan_budget` | write | wan |  |  | wan, action, enabled, limitMb, limitGb | - | - |  |
| `wan_vlan` | write | wan |  |  | wan, action, tagValue, enabled, priority | - | - |  |
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
| `mngt_sshtimeout` | write | mngt |  |  | seconds | - | - |  |
| `mngt_telnettimeout` | write | mngt |  |  | seconds | - | - |  |
| `mngt_noping` | write | mngt |  |  | action | - | - |  |
| `mngt_defenseworm` | write | mngt |  |  | action, port | - | - |  |
| `mngt_bfp` | write | mngt | yes |  | args | - | - |  |
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
| `ipf_set` | write | ipf | yes |  | action, setNo, pass, logToSyslog, family, enabled, page | - | - |  |
| `ipf_rule` | write | ipf | yes |  | setNo, ruleNo, action, enabled, direction | - | - |  |
| `ipf_flowtrack_view` | read | ipf |  |  | mode | - | - |  |
| `ipf_flowtrack_set` | write | ipf | yes |  | action | - | - |  |
| `vpn_list` | read | vpn |  |  | - | - | - |  |
| `vpn_remote` | read | vpn |  |  | - | - | - |  |
| `vpn_graph` | read | vpn |  |  | - | - | - |  |
| `vpn_setup` | write | vpn |  | yes | index, param | - | param |  |
| `vpn_ovpn` | write | vpn |  | yes | param | - | param |  |
| `vpn_dial_out` | write | vpn |  | yes | param | - | - |  |
| `qos_setup` | write | qos |  | yes | wanInterface, mode, inboundBandwidthKbps, outboundBandwidthKbps, classIndex, ratioPercent, udpBandwidthControlEnabled, udpBandwidthLimitRatioPercent, outboundTcpAckPrioritizeEnabled, showAll, minNonVoipInboundBandwidthKbps, minNonVoipOutboundBandwidthKbps, voipBandwidthAdjustMode | - | - |  |
| `qos_class` | write | qos |  | yes | classIndex, action, ruleIndex, name, ruleEnabled, localAddress | - | - |  |
| `qos_type` | write | qos |  | yes | action, name, protocolType, portRange | - | - |  |
| `qos_voip` | write | qos |  | yes | enabled | - | - |  |
| `dos_view` | read | dos |  |  | - | - | - |  |
| `dos_blacklist_show` | read | dos |  |  | - | - | - |  |
| `dos_whitelist_show` | read | dos |  |  | - | - | - |  |
| `dos_activate` | write | dos |  | yes | - | - | - |  |
| `dos_deactivate` | write | dos | yes | yes | - | - | - |  |
| `internet_view` | read | internet |  |  | - | - | - |  |
| `internet_set` | write | internet | yes | yes | wan, mode, ispName, username, password | - | password |  |
| `ha_show` | read | ha |  |  | section | - | - |  |
| `ha_status` | read | ha |  |  | scope, detailLevel | - | - |  |
| `ha_set` | write | ha | yes | yes | args | - | - |  |
| `vrrp_show` | read | vrrp |  |  | - | - | - |  |
| `vrrp_enable` | write | vrrp | yes | yes | onOff | - | - |  |
| `vrrp_set` | write | vrrp |  | yes | param | - | - |  |
| `vrrp_apply` | write | vrrp |  |  | - | - | - |  |
| `vrrp_reset` | write | vrrp |  |  | - | - | - |  |
| `vigbrg_status` | read | vigbrg |  |  | - | - | - |  |
| `vigbrg_wanstatus` | read | vigbrg |  |  | - | - | - |  |
| `vigbrg_wlanstatus` | read | vigbrg |  |  | - | - | - |  |
| `vigbrg_set` | write | vigbrg |  | yes | ipVersion, wanIndex, lanIndex, bridgeEnabled, firewallEnabled | - | - |  |
| `vlan_status` | read | vlan |  |  | - | - | - |  |
| `vlan_on` | write | vlan | yes | yes | - | vlan_status | - |  |
| `vlan_off` | write | vlan | yes | yes | - | vlan_status | - |  |
| `vlan_group` | write | vlan |  | yes | groupId, action, ports | vlan_status | - |  |
| `switch_status` | read | switch |  |  | - | - | - |  |
| `switch_list` | read | switch |  |  | - | - | - |  |
| `switch_query` | read | switch |  |  | - | - | - |  |
| `switch_on` | write | switch |  |  | - | - | - |  |
| `switch_off` | write | switch |  |  | - | - | - |  |
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
| `hsportal_setup` | write | hsportal |  |  | profile, action, mode, enabled, appKey, appId | - | appKey, appId |  |
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
| `user_account` | write | user | yes |  | userName, param | - | param, userName |  |
| `user_edit` | write | user |  |  | profileIdx, param | - | param |  |
| `user_set` | write | user |  |  | param | - | param |  |
| `user_setdefault` | write | user | yes |  | - | - | - |  |
| `upnp_on` | write | upnp |  | yes | - | - | - |  |
| `upnp_off` | write | upnp |  | yes | - | - | - |  |
| `upnp_nat` | read | upnp |  |  | - | - | - |  |
| `wol_send` | write | wol |  |  | mac | - | - | yes |
| `appqos_view` | read | appqos |  |  | - | - | - |  |
| `appqos_enable` | write | appqos |  |  | mode | - | - |  |
| `service_show` | read | service |  |  | - | - | - |  |
| `service_get` | read | service |  |  | - | - | - |  |
| `csm_appe_show` | read | csm |  |  | group | - | - |  |
| `csm_appe_set` | write | csm |  |  | index, action, group, appIndex | - | - |  |
| `csm_ucf` | write | csm |  |  | action, message, index, name, value, logType | - | - |  |
| `csm_wcf` | write | csm |  |  | action, server, message, index, objAction, name, logType | - | - |  |
| `csm_dnsf` | write | csm |  |  | action, state, value, index, hours, blockpage, name, logType | - | - |  |
| `msubnet_status` | read | msubnet |  |  | - | - | - |  |
| `msubnet_switch` | write | msubnet | yes | yes | onoff | - | - |  |
| `testmail_send` | write | testmail |  |  | - | - | - | yes |
| `ip6_ping` | read | ip6 |  |  | host | - | - |  |
| `ip6_tracert` | read | ip6 |  |  | host | - | - |  |
| `ip6_addr` | write | ip6 |  | yes | args | - | - |  |
| `ip6_mngt` | write | ip6 |  |  | proto, onoff | - | - |  |
| `ldap_view` | read | ldap |  |  | - | - | - |  |
| `ldap_set` | write | ldap |  |  | option, enabled, bindType, ipAddress, port, value | - | value |  |
| `ldap_user` | write | ldap |  |  | index, action, value | - | - |  |
| `tacacsplus_view` | read | tacacsplus |  |  | - | - | - |  |
| `tacacsplus_set` | write | tacacsplus |  |  | action, enabled, serverIndex, ipAddress, port, secret | - | secret |  |
| `portmaptime_list` | read | portmaptime |  |  | - | - | - |  |
| `portmaptime_set` | write | portmaptime |  |  | proto, seconds | - | - |  |
| `portmaptime_flush` | write | portmaptime |  | yes | - | - | - |  |
| `swm_show` | read | swm |  |  | - | - | - |  |
| `swm_get` | read | swm |  |  | - | - | - |  |
| `swm_enable` | write | swm |  |  | - | - | - |  |
| `swm_disable` | write | swm |  |  | - | - | - |  |
| `swm_post` | write | swm |  |  | mac | - | - |  |
| `swm_group` | write | swm |  |  | action, idx, name, password, mac | - | password |  |
| `swm_profile` | write | swm |  |  | action, mac | - | - |  |
| `swm_detail` | write | swm |  |  | action, mac, comment, name, password, configIndex, port, flag, schedule1, schedule2, description, direction, enabled, limit | - | password |  |
| `swm_maintain` | write | swm | yes |  | action, mac | - | - |  |
| `swm_search` | write | swm |  |  | action, mac, ip, query | - | - |  |
| `swm_db` | write | swm |  |  | action, enabled, mode, idx | - | - |  |
| `swm_alert` | write | swm |  |  | action, enabled, idx, name, color, objectIndex, objectValue | - | - |  |
| `swm_log` | write | swm |  |  | action, idx, enabled, mac | - | - |  |
| `swm_snmp` | write | swm |  |  | action, mac, portNum, name | - | - |  |
| `swm_tr069` | write | swm |  |  | args | - | - |  |
| `apm_cache_clear` | write | sdk_void |  |  | - | - | - |  |
| `apm_cache_show` | read | sdk_void |  |  | - | - | - |  |
| `apm_clear` | write | sdk_void |  |  | - | - | - |  |
| `apm_discover` | read | sdk_void |  |  | - | - | - |  |
| `apm_lbcfg_show` | read | sdk_void |  |  | - | - | - |  |
| `apm_profile_reset` | write | sdk_void |  |  | - | - | - |  |
| `apm_profile_summary` | read | sdk_void |  |  | - | - | - |  |
| `apm_syslog` | read | sdk_void |  |  | - | - | - |  |
| `appqos_traceable_v` | read | sdk_void |  |  | - | - | - |  |
| `appqos_untraceable_v` | read | sdk_void |  |  | - | - | - |  |
| `ddns_setdefault` | write | sdk_void |  |  | - | - | - |  |
| `ip_bgp_show` | read | sdk_void |  |  | - | - | - |  |
| `ip_bgp_static_show` | read | sdk_void |  |  | - | - | - |  |
| `ip_dataflowmonitor_off` | write | sdk_void |  |  | - | - | - |  |
| `ip_dataflowmonitor_on` | write | sdk_void |  |  | - | - | - |  |
| `ip_dataflowmonitor_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_reset` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_set` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_wan` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_disable` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_enable` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_table` | read | sdk_void |  |  | - | - | - |  |
| `ip_ospf_cfg_show` | read | sdk_void |  |  | - | - | - |  |
| `ip_ospf_dis` | write | sdk_void |  |  | - | - | - |  |
| `ip_ospf_en` | write | sdk_void |  |  | - | - | - |  |
| `ip_ospf_nbr` | read | sdk_void |  |  | - | - | - |  |
| `ip_ospf_status` | read | sdk_void |  |  | - | - | - |  |
| `ip6_ntp_v` | read | sdk_void |  |  | - | - | - |  |
| `linux_clean_a` | write | sdk_void |  |  | - | - | - |  |
| `linux_clean_b` | write | sdk_void |  |  | - | - | - |  |
| `linux_clean_d` | write | sdk_void |  |  | - | - | - |  |
| `linux_clean_o` | write | sdk_void | yes |  | - | - | - |  |
| `linux_clean_w` | write | sdk_void | yes |  | - | - | - |  |
| `linux_ring_clean` | write | sdk_void |  |  | - | - | - |  |
| `linux_ring_debug` | read | sdk_void |  |  | - | - | - |  |
| `linux_ring_send` | write | sdk_void |  |  | - | - | - |  |
| `linux_ring_set` | write | sdk_void |  |  | - | - | - |  |
| `linux_ring_test` | write | sdk_void |  |  | - | - | - |  |
| `linux_service_ssh_status` | read | sdk_void |  |  | - | - | - |  |
| `linux_service_telnet_disable` | write | sdk_void |  |  | - | - | - |  |
| `linux_service_telnet_enable` | write | sdk_void |  |  | - | - | - |  |
| `linux_service_telnet_status` | read | sdk_void |  |  | - | - | - |  |
| `linux_syslog_disable` | write | sdk_void |  |  | - | - | - |  |
| `linux_syslog_enable` | write | sdk_void |  |  | - | - | - |  |
| `linux_syslog_status` | read | sdk_void |  |  | - | - | - |  |
| `log_h` | read | sdk_void |  |  | - | - | - |  |
| `log_x` | read | sdk_void |  |  | - | - | - |  |
| `mngt_rmtcfg_disable` | write | sdk_void |  |  | - | - | - |  |
| `mngt_rmtcfg_enable` | write | sdk_void | yes |  | - | - | - |  |
| `mngt_rmtcfg_status` | read | sdk_void |  |  | - | - | - |  |
| `port_8021x_disable` | write | sdk_void |  |  | - | - | - |  |
| `port_8021x_enable` | write | sdk_void |  |  | - | - | - |  |
| `port_8021x_status` | read | sdk_void |  |  | - | - | - |  |
| `radius_external_view` | read | sdk_void |  |  | - | - | - |  |
| `service` | read | sdk_void |  |  | - | - | - |  |
| `srv_dhcp_public_status` | read | sdk_void |  |  | - | - | - |  |
| `srv_dhcp_tftpdel` | write | sdk_void |  |  | - | - | - |  |
| `srv_nat_showall` | read | sdk_void |  |  | - | - | - |  |
| `srv_nat_status` | read | sdk_void |  |  | - | - | - |  |
| `sys_cfg_default` | write | sdk_void | yes |  | - | - | - |  |
| `sys_cfg_status` | read | sdk_void |  |  | - | - | - |  |
| `sys_iface` | read | sdk_void |  |  | - | - | - |  |
| `upnp_service` | read | sdk_void |  |  | - | - | - |  |
| `upnp_subscribe` | read | sdk_void |  |  | - | - | - |  |
| `upnp_tmpvs` | read | sdk_void |  |  | - | - | - |  |
| `usb_user_list` | read | sdk_void |  |  | - | - | - |  |
| `vigbrg_closeall` | write | sdk_void |  |  | - | - | - |  |
| `vlan_restart` | write | sdk_void |  |  | - | - | - |  |
| `vlan_submode_off` | write | sdk_void |  |  | - | - | - |  |
| `vlan_submode_on` | write | sdk_void |  |  | - | - | - |  |
| `vlan_submode_status` | read | sdk_void |  |  | - | - | - |  |
| `vpn_fromlan_disable` | write | sdk_void |  |  | - | - | - |  |
| `vpn_fromlan_enable` | write | sdk_void |  |  | - | - | - |  |
| `vpn_fromlan_status` | read | sdk_void |  |  | - | - | - |  |
| `vpn_l2ldrop` | write | sdk_void |  |  | - | - | - |  |
| `vpn_mss_default` | write | sdk_void |  |  | - | - | - |  |
| `vpn_mss_show` | read | sdk_void |  |  | - | - | - |  |
| `sdk_wan_detect` | read | sdk_void |  |  | - | - | - |  |
| `wan_multifno_status` | read | sdk_void |  |  | - | - | - |  |

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
