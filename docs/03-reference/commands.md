# Command registry

Every command in the registry becomes an MCP tool. Generated from
`src/commands/registry/` — do not edit generated docs by hand; run
`node tools/gen-commands.mjs`.

**Totals:** 666 commands · 220 read · 446 write · 43 families

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
- **sdk_void** — Auto-registered SDK operations not already curated (schema-derived args).

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
| `wan_detect_mtu` | read | wan |  |  | host, mtuSize, decreaseSize, wanInterface, count | - | - |  |
| `wan_detect_mtu6` | read | wan |  |  | host, mtuSize, wanInterface | - | - |  |
| `wan_enable` | write | wan | yes | yes | wan | wan_status | - |  |
| `wan_disable` | write | wan | yes | yes | wan | wan_status | - |  |
| `wan_mtu` | write | wan |  |  | target, value | - | - |  |
| `wan_dns` | write | wan |  |  | wanNo, dnsSelect, ipv4Address | - | - |  |
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
| `nat_dmz` | write | srv | yes | yes | action, wan, index, privateIp, enabled | show_dmz | - |  |
| `ip_route_status` | read | ip |  |  | - | - | - |  |
| `ip_arp_status` | read | ip |  |  | - | - | - |  |
| `ip_ping` | read | ip |  |  | host | - | - |  |
| `ip_tracert` | read | ip |  |  | host | - | - |  |
| `ip_session` | read | ip |  |  | action | - | - |  |
| `ip_dnsforward` | read | ip |  |  | - | - | - |  |
| `ip_lanDNSRes` | read | ip |  |  | - | - | - |  |
| `ip_addr` | write | ip | yes | yes | lan, ip | show_lan | - |  |
| `ip_nmask` | write | ip | yes | yes | lan, mask | show_lan | - |  |
| `ip_route_add` | write | ip |  | yes | dst, netmask, gateway, ifno, rtype | ip_route_status | - |  |
| `ip_route_del` | write | ip |  | yes | dst, netmask, rtype | ip_route_status | - |  |
| `ip_bindmac` | write | ip |  |  | action, mode, ipv4Address, mac, comment, target, lanIndex | - | - |  |
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
| `linux_setlinuxip` | write | linux | yes | yes | ip, cidr, gateway | - | password |  |
| `port_status` | read | port |  |  | - | - | - |  |
| `port_sniff_status` | read | port |  |  | - | - | - |  |
| `port_speed` | write | port |  | yes | port, speed | - | - |  |
| `ddns_show` | read | ddns |  |  | accountIndex | - | - |  |
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
| `apm_stanum` | read | apm |  |  | apIndex | - | - |  |
| `apm_enable` | write | apm |  |  | - | - | - |  |
| `apm_disable` | write | apm |  |  | - | - | - |  |
| `dpdk_statistic` | read | dpdk |  |  | - | - | - |  |
| `dpdk_cmdlog` | read | dpdk |  |  | - | - | - |  |
| `nand_usage` | read | nand |  |  | - | - | - |  |
| `nand_bad` | read | nand |  |  | - | - | - |  |
| `usb_devstat` | read | usb |  |  | - | - | - |  |
| `usb_temp` | read | usb |  |  | action | - | - |  |
| `usb_disk` | read | usb |  |  | - | - | - |  |
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
| `object_ip_view` | read | object |  |  | index | - | - |  |
| `object_service_view` | read | object |  |  | index | - | - |  |
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
| `msubnet_status` | read | msubnet |  |  | lanIndex | - | - |  |
| `msubnet_switch` | write | msubnet | yes | yes | lanIndex, enabled | - | - |  |
| `testmail_send` | write | testmail |  |  | - | - | - | yes |
| `ip6_ping` | read | ip6 |  |  | host | - | - |  |
| `ip6_tracert` | read | ip6 |  |  | host | - | - |  |
| `ip6_addr` | write | ip6 |  | yes | action, prefix, prefixLength, interfaceLabel, unicastOnly, oldPrefix, oldPrefixLength, newPrefix, newPrefixLength, mode, wan, lan, type | - | - |  |
| `ip6_mngt` | write | ip6 |  |  | proto, onoff | - | - |  |
| `ldap_view` | read | ldap |  |  | - | - | - |  |
| `ldap_set` | write | ldap |  |  | option, enabled, bindType, ipAddress, port, value | - | value |  |
| `ldap_user` | write | ldap |  |  | index, action, value | - | - |  |
| `tacacsplus_view` | read | tacacsplus |  |  | - | - | - |  |
| `tacacsplus_set` | write | tacacsplus |  |  | action, enabled, serverIndex, ipAddress, port, secret | - | secret |  |
| `portmaptime_list` | read | portmaptime |  |  | - | - | - |  |
| `portmaptime_set` | write | portmaptime |  |  | proto, seconds | - | - |  |
| `portmaptime_flush` | write | portmaptime |  | yes | - | - | - |  |
| `swm_show` | read | swm |  |  | lanPort | - | - |  |
| `swm_get` | read | swm |  |  | mac | - | - |  |
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
| `apm_apsyslog` | read | sdk_void |  |  | apIndex | - | - |  |
| `apm_cache_clear` | write | sdk_void |  |  | - | - | - |  |
| `apm_cache_show` | read | sdk_void |  |  | - | - | - |  |
| `apm_clear` | write | sdk_void |  |  | - | - | - |  |
| `apm_discover` | read | sdk_void |  |  | - | - | - |  |
| `apm_lbcfg_set` | write | sdk_void |  |  | enableLoadBalance, enableStationLimit, enableTrafficLimit, stationLimit, enableUploadLimit, enableDownloadLimit, enableIdleDisassociation, enableSignalDisassociation, uploadUnit, downloadUnit, rssiThreshold | - | - |  |
| `apm_lbcfg_show` | read | sdk_void |  |  | - | - | - |  |
| `apm_profile_apply` | write | sdk_void |  |  | profileIndex, clientIndexes | - | - |  |
| `apm_profile_clone` | write | sdk_void |  |  | fromIndex, toIndex, newName | - | - |  |
| `apm_profile_del` | write | sdk_void |  |  | index | - | - |  |
| `apm_profile_reset` | write | sdk_void |  |  | - | - | - |  |
| `apm_profile_show` | read | sdk_void |  |  | index | - | - |  |
| `apm_profile_summary` | read | sdk_void |  |  | - | - | - |  |
| `apm_syslog` | read | sdk_void |  |  | - | - | - |  |
| `appqos_traceable_d` | write | sdk_void |  |  | appIndex | - | - |  |
| `appqos_traceable_e` | write | sdk_void |  |  | appIndex, qosClass | - | - |  |
| `appqos_traceable_v` | read | sdk_void |  |  | - | - | - |  |
| `appqos_untraceable_d` | write | sdk_void |  |  | appIndex | - | - |  |
| `appqos_untraceable_e` | write | sdk_void |  |  | appIndex, qosClass | - | - |  |
| `appqos_untraceable_v` | read | sdk_void |  |  | - | - | - |  |
| `csm_appe_config` | read | sdk_void |  |  | index, group | - | - |  |
| `csm_appe_prof` | write | sdk_void |  |  | action, index, name | - | - |  |
| `csm_dnsf_localbw_clear` | write | sdk_void | yes |  | - | - | - |  |
| `csm_dnsf_localbw_set` | write | sdk_void |  |  | action, type, values, item, groupIndex, objectIndex | - | - |  |
| `csm_dnsf_localbw_show` | read | sdk_void |  |  | - | - | - |  |
| `csm_ucf_obj_index_eac` | write | sdk_void |  |  | action, index, objectIndex, groupIndex | - | - |  |
| `csm_ucf_obj_index_uac` | write | sdk_void |  |  | action, index, value, objectIndex, groupIndex | - | - |  |
| `csm_ucf_obj_index_wf` | write | sdk_void |  |  | action, index, value, feature, fileExtensionIndex | - | - |  |
| `ddns_set` | write | sdk_void |  |  | accountIndex, serviceProvider, serviceType, domainName, loginName, password | - | password |  |
| `ddns_set_update` | write | sdk_void |  |  | accountIndex, serviceProvider, serviceType, domain, loginName, password, enabled, wanInterface, wildcards, backupMx, mailExtender, realWanIp, providerHost, serviceApi, authType, connectionType, serverResponse | - | password |  |
| `ddns_setdefault` | write | sdk_void |  |  | - | - | - |  |
| `ddns_show_all` | read | sdk_void |  |  | - | - | - |  |
| `ddns_time` | write | sdk_void |  |  | minutes | - | - |  |
| `dos` | write | sdk_void |  |  | args | - | - |  |
| `fs_cat` | read | sdk_void |  |  | path | - | - |  |
| `fs_cd` | write | sdk_void |  |  | path | - | - |  |
| `fs_cp` | write | sdk_void |  |  | source, target | - | - |  |
| `fs_format` | write | sdk_void | yes |  | - | - | - |  |
| `fs_mkdir` | write | sdk_void |  |  | path | - | - |  |
| `fs_mkfile` | write | sdk_void |  |  | path | - | - |  |
| `fs_ren` | write | sdk_void |  |  | source, target | - | - |  |
| `fs_rm` | write | sdk_void | yes |  | path, directory | - | - |  |
| `fs_test` | write | sdk_void |  |  | path | - | - |  |
| `hsportal_info_clear` | write | sdk_void | yes |  | - | - | - |  |
| `hsportal_info_set` | write | sdk_void |  |  | option, enabled, objectIndex | - | - |  |
| `hsportal_level_delete` | write | sdk_void |  |  | profile | - | - |  |
| `hsportal_level_set` | write | sdk_void |  |  | profile, settings, reconnectAt | - | - |  |
| `internet` | write | sdk_void |  |  | wanInterface, mode, ispName, pppoeService, username, password, pppAuthType, idleTimeout, pppoeClientIp, wanIp, wanNetmask, gateway, serverIp, alwaysOnBackupWan, backupMode | - | password |  |
| `ip_arp` | read | sdk_void |  |  | action | - | - |  |
| `ip_arp_accept` | write | sdk_void |  |  | mode | - | - |  |
| `ip_arp_add` | write | sdk_void |  |  | ipv4Address, mac, direction | - | - |  |
| `ip_arp_del` | write | sdk_void |  |  | ipv4Address, direction | - | - |  |
| `ip_arp_flush` | write | sdk_void |  |  | - | - | - |  |
| `ip_arp_setcachelife` | write | sdk_void |  |  | seconds | - | - |  |
| `ip_bandwidth` | write | sdk_void |  |  | action, enabled, txRateKbps, rxRateKbps, profiles, ipStart, ipEnd, shared | - | - |  |
| `ip_bgp` | write | sdk_void |  |  | action, enabled, asNumber, seconds, ipv4Address, idx, name, weight, prepend, key, sidx, netmask | - | key |  |
| `ip_bgp_neighbor_show` | read | sdk_void |  |  | action, idx | - | - |  |
| `ip_bgp_show` | read | sdk_void |  |  | - | - | - |  |
| `ip_bgp_static_show` | read | sdk_void |  |  | - | - | - |  |
| `ip_dataflowmonitor_off` | write | sdk_void |  |  | - | - | - |  |
| `ip_dataflowmonitor_on` | write | sdk_void |  |  | - | - | - |  |
| `ip_dataflowmonitor_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_dhcpc` | write | sdk_void |  |  | action, wanNumber, enabled, optionNumber, value, valueType, index | - | - |  |
| `ip_igmpfl` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_igmpfl_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_ppp` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_igmpproxy_query` | write | sdk_void |  |  | intervalMs | - | - |  |
| `ip_igmpproxy_reset` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_set` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpproxy_syslog` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_igmpproxy_version` | write | sdk_void |  |  | version | - | - |  |
| `ip_igmpproxy_wan` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_acceptlist` | write | sdk_void |  |  | type, index | - | - |  |
| `ip_igmpsnoop_chkleave` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_igmpsnoop_disable` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_enable` | write | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_mode` | write | sdk_void |  |  | mode | - | - |  |
| `ip_igmpsnoop_portchk` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_igmpsnoop_separate` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_igmpsnoop_status` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_table` | read | sdk_void |  |  | - | - | - |  |
| `ip_igmpsnoop_txquery` | write | sdk_void |  |  | enabled, version | - | - |  |
| `ip_lanalias` | write | sdk_void |  |  | action, idx, enabled, ipv4Address, wanNumber | - | - |  |
| `ip_maxnatuser` | write | sdk_void |  |  | userCount | - | - |  |
| `ip_ospf_cfg_set` | write | sdk_void |  |  | action, idx, enabled, areaId, lanNumber, wanNumber | - | - |  |
| `ip_ospf_cfg_show` | read | sdk_void |  |  | - | - | - |  |
| `ip_ospf_dis` | write | sdk_void |  |  | - | - | - |  |
| `ip_ospf_en` | write | sdk_void |  |  | - | - | - |  |
| `ip_ospf_nbr` | read | sdk_void |  |  | - | - | - |  |
| `ip_ospf_status` | read | sdk_void |  |  | - | - | - |  |
| `sdk_ip_ping` | read | sdk_void |  |  | targetIp, wanInterface, sourceIp | - | - |  |
| `ip_policyrt` | write | sdk_void |  |  | args | - | - |  |
| `ip_pubaddr` | write | sdk_void |  |  | ipv4Address | - | - |  |
| `ip_pubmask` | write | sdk_void |  |  | netmask | - | - |  |
| `ip_pubsubnet` | write | sdk_void |  |  | enabled | - | - |  |
| `ip_rip` | write | sdk_void |  |  | mode | - | - |  |
| `ip_route_clean` | write | sdk_void | yes |  | enabled | - | - |  |
| `ip_route_cnc` | read | sdk_void |  |  | - | - | - |  |
| `ip_route_default` | write | sdk_void | yes |  | mode | - | - |  |
| `ip_route_tel` | read | sdk_void |  |  | - | - | - |  |
| `ip_session_add` | write | sdk_void |  |  | ip1, ip2, num, p2pNum | - | - |  |
| `ip_session_block` | write | sdk_void |  |  | ipv4Address | - | - |  |
| `ip_session_default` | write | sdk_void |  |  | value | - | - |  |
| `ip_session_defaultp2p` | write | sdk_void |  |  | value | - | - |  |
| `ip_session_del` | write | sdk_void |  |  | ip1, ip2, num, p2pNum | - | - |  |
| `ip_session_list` | read | sdk_void |  |  | - | - | - |  |
| `ip_session_off` | write | sdk_void |  |  | - | - | - |  |
| `ip_session_on` | write | sdk_void |  |  | - | - | - |  |
| `ip_session_timer` | write | sdk_void |  |  | value | - | - |  |
| `ip_session_unblock` | write | sdk_void |  |  | ipv4Address | - | - |  |
| `ip_spoofdef` | write | sdk_void |  |  | side, enabled | - | - |  |
| `sdk_ip_tracert` | read | sdk_void |  |  | targetIp, wanInterface, protocol | - | - |  |
| `ip_wanrip` | write | sdk_void |  |  | interfaceNumber, enabled | - | - |  |
| `ip6_aiccu` | write | sdk_void |  |  | action, wan | - | - |  |
| `ip6_bandwidth` | write | sdk_void |  |  | action, txRate, rxRate, ipStart, ipEnd, shared | - | - |  |
| `ip6_dhcp_client` | write | sdk_void |  |  | action, wan, enabled, iaid | - | - |  |
| `ip6_dhcp_optionc` | write | sdk_void |  |  | action, index, enabled, wan, optionNumber, value | - | - |  |
| `ip6_dhcp_options` | write | sdk_void |  |  | action, index, enabled, lan, optionNumber, value | - | - |  |
| `ip6_dhcp_reqopt` | write | sdk_void |  |  | action, interfaceLabel, flag, enabled | - | - |  |
| `ip6_dhcp_server` | write | sdk_void |  |  | action, enabled, address | - | - |  |
| `ip6_internet` | write | sdk_void |  |  | action, wan, mode, username, password, server | - | password |  |
| `ip6_lan` | write | sdk_void |  |  | action, lan, primaryWan, dns1, otherOption, disableIpv6, showLan, dns2, management, addExtensionWan, deleteExtensionWan, extensionWanBitmap, ripng | - | - |  |
| `sdk_ip6_mngt` | write | sdk_void |  |  | action, index, objectIndex, service, enabled | - | - |  |
| `ip6_neigh_a` | read | sdk_void |  |  | address, interfaceLabel | - | - |  |
| `ip6_neigh_d` | write | sdk_void |  |  | address, interfaceLabel | - | - |  |
| `ip6_neigh_s` | write | sdk_void |  |  | address, mac, interfaceLabel | - | - |  |
| `ip6_ntp_p` | write | sdk_void |  |  | priority | - | - |  |
| `ip6_ntp_v` | read | sdk_void |  |  | - | - | - |  |
| `ip6_online` | read | sdk_void |  |  | wan | - | - |  |
| `sdk_ip6_ping` | read | sdk_void |  |  | target, interfaceLabel, sendCount, dataSize | - | - |  |
| `ip6_pneigh` | write | sdk_void |  |  | action, address, interfaceLabel | - | - |  |
| `ip6_radvd` | write | sdk_void |  |  | action, interfaceLabel, enabled, seconds | - | - |  |
| `ip6_route` | write | sdk_void |  |  | action, prefix, prefixLength, gateway, interfaceLabel, asDefault | - | - |  |
| `ip6_session` | write | sdk_void |  |  | action, limit, ipStart, ipEnd | - | - |  |
| `sdk_ip6_tracert` | read | sdk_void |  |  | target, interfaceLabel | - | - |  |
| `ip6_tspc` | read | sdk_void |  |  | wan | - | - |  |
| `ipf_default` | write | sdk_void | yes |  | - | - | - |  |
| `ipf_hashanalysis` | read | sdk_void |  |  | view, hashCounts, begin, end | - | - |  |
| `ipf_set_rule` | write | sdk_void |  |  | setNo, ruleNo, options | - | - |  |
| `sdk_ipf_view` | read | sdk_void |  |  | flags | - | - |  |
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
| `linux_service_telnet_setport` | write | sdk_void |  |  | port | - | - |  |
| `linux_service_telnet_status` | read | sdk_void |  |  | - | - | - |  |
| `sdk_linux_setlinuxip` | write | sdk_void |  |  | ip, cidr, gateway, vlan, password | - | password |  |
| `linux_syslog_disable` | write | sdk_void |  |  | - | - | - |  |
| `linux_syslog_enable` | write | sdk_void |  |  | - | - | - |  |
| `linux_syslog_status` | read | sdk_void |  |  | - | - | - |  |
| `local8021x_cerset` | write | sdk_void |  |  | uid | - | - |  |
| `local8021x_enable` | write | sdk_void |  |  | enabled | - | - |  |
| `local8021x_method` | write | sdk_void |  |  | action, method | - | - |  |
| `local8021x_showlocalcer` | read | sdk_void |  |  | - | - | - |  |
| `log_F` | write | sdk_void |  |  | target | - | - |  |
| `log_h` | read | sdk_void |  |  | - | - | - |  |
| `log_x` | read | sdk_void |  |  | - | - | - |  |
| `mngt_accesslist` | write | sdk_void |  |  | args | - | - |  |
| `mngt_certimport` | write | sdk_void |  |  | kind, url, password | - | password |  |
| `mngt_echoicmp` | write | sdk_void |  |  | action | - | - |  |
| `mngt_ftpport` | write | sdk_void |  |  | port | - | - |  |
| `mngt_ip6iids` | write | sdk_void |  |  | action, mode, iface | - | - |  |
| `mngt_lanaccess` | write | sdk_void |  |  | args | - | - |  |
| `mngt_lbinterface` | write | sdk_void |  |  | action, lan | - | - |  |
| `mngt_lbinterface_status` | read | sdk_void |  |  | - | - | - |  |
| `mngt_nosecurel2tpmngt` | write | sdk_void |  |  | enabled | - | - |  |
| `mngt_rmtcfg_disable` | write | sdk_void |  |  | - | - | - |  |
| `mngt_rmtcfg_enable` | write | sdk_void | yes |  | - | - | - |  |
| `mngt_rmtcfg_protocol` | write | sdk_void |  |  | protocol, onOff | - | - |  |
| `mngt_rmtcfg_status` | read | sdk_void |  |  | - | - | - |  |
| `mngt_snmp` | write | sdk_void |  |  | args | - | - |  |
| `mngt_ssholdkex` | write | sdk_void |  |  | enabled | - | - |  |
| `mngt_sslvpnport` | write | sdk_void |  |  | port | - | - |  |
| `mngt_validationcode` | write | sdk_void |  |  | enabled | - | - |  |
| `mngt_wanlogin` | write | sdk_void |  |  | action | - | - |  |
| `msubnet_addr` | write | sdk_void |  |  | lanIndex, ipAddress | - | - |  |
| `msubnet_dhcps` | write | sdk_void |  |  | lanIndex, enabled | - | - |  |
| `msubnet_gateway` | write | sdk_void |  |  | lanIndex, gatewayIp | - | - |  |
| `msubnet_ipcnt` | write | sdk_void |  |  | lanIndex, ipCount | - | - |  |
| `msubnet_leasetime` | write | sdk_void |  |  | lanIndex, leaseTimeSec | - | - |  |
| `msubnet_mtu` | write | sdk_void |  |  | interfaceName, mtuValue | - | - |  |
| `msubnet_nat` | write | sdk_void |  |  | lanIndex, natEnabled | - | - |  |
| `msubnet_nmask` | write | sdk_void |  |  | lanIndex, netmask | - | - |  |
| `msubnet_nodetype` | write | sdk_void |  |  | lanIndex, nodeType | - | - |  |
| `msubnet_pppip` | write | sdk_void |  |  | lanIndex, startIp | - | - |  |
| `msubnet_primwins` | write | sdk_void |  |  | lanIndex, winsIp | - | - |  |
| `msubnet_secwins` | write | sdk_void |  |  | lanIndex, winsIp | - | - |  |
| `msubnet_startip` | write | sdk_void |  |  | lanIndex, startIp | - | - |  |
| `msubnet_talk` | write | sdk_void |  |  | firstLanIndex, secondLanIndex, enabled | - | - |  |
| `msubnet_tftp` | write | sdk_void |  |  | lanIndex, serverName | - | - |  |
| `nand_bad_nand_usage` | read | sdk_void |  |  | action | - | - |  |
| `object_country` | write | sdk_void |  |  | index, name | - | - |  |
| `object_country_activate` | write | sdk_void |  |  | - | - | - |  |
| `object_country_list` | read | sdk_void |  |  | - | - | - |  |
| `object_country_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_country_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_country_view` | read | sdk_void |  |  | index | - | - |  |
| `object_fe` | write | sdk_void |  |  | index, name | - | - |  |
| `object_fe_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_fe_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_fe_show` | read | sdk_void |  |  | - | - | - |  |
| `object_fe_view` | read | sdk_void |  |  | index | - | - |  |
| `object_ip_grp` | write | sdk_void |  |  | index, name | - | - |  |
| `object_ip_grp_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_ip_grp_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_ip_grp_view` | read | sdk_void |  |  | index | - | - |  |
| `object_ip_obj_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_ip_obj_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_ipv6_grp` | write | sdk_void |  |  | index, name | - | - |  |
| `object_ipv6_grp_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_ipv6_grp_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_ipv6_grp_view` | read | sdk_void |  |  | index | - | - |  |
| `object_ipv6_obj` | write | sdk_void |  |  | index, name | - | - |  |
| `object_ipv6_obj_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_ipv6_obj_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_ipv6_obj_view` | read | sdk_void |  |  | index | - | - |  |
| `object_kw` | write | sdk_void |  |  | index, name | - | - |  |
| `object_kw_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_kw_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_kw_show` | read | sdk_void |  |  | page | - | - |  |
| `object_kw_view` | read | sdk_void |  |  | index | - | - |  |
| `object_mail` | write | sdk_void |  |  | index, name | - | - |  |
| `object_mail_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_mail_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_mail_show` | read | sdk_void |  |  | - | - | - |  |
| `object_mail_view` | read | sdk_void |  |  | index | - | - |  |
| `object_noti` | write | sdk_void |  |  | index, name | - | - |  |
| `object_noti_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_noti_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_noti_show` | read | sdk_void |  |  | - | - | - |  |
| `object_noti_view` | read | sdk_void |  |  | index | - | - |  |
| `object_schedule` | write | sdk_void |  |  | index, enabled | - | - |  |
| `object_schedule_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_schedule_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_schedule_view` | read | sdk_void |  |  | index | - | - |  |
| `object_service_grp` | write | sdk_void |  |  | index, name | - | - |  |
| `object_service_grp_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_service_grp_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_service_grp_view` | read | sdk_void |  |  | index | - | - |  |
| `object_service_obj_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_service_obj_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_sms` | write | sdk_void |  |  | index, name | - | - |  |
| `object_sms_set` | write | sdk_void |  |  | index, flag, values | - | - |  |
| `object_sms_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `object_sms_show` | read | sdk_void |  |  | - | - | - |  |
| `object_sms_view` | read | sdk_void |  |  | index | - | - |  |
| `port` | write | sdk_void |  |  | kind, port, speed | - | - |  |
| `port_8021x_addport` | write | sdk_void |  |  | portNumber | - | - |  |
| `port_8021x_delport` | write | sdk_void |  |  | portNumber | - | - |  |
| `port_8021x_disable` | write | sdk_void |  |  | - | - | - |  |
| `port_8021x_enable` | write | sdk_void |  |  | - | - | - |  |
| `port_8021x_status` | read | sdk_void |  |  | - | - | - |  |
| `port_sniff` | write | sdk_void |  |  | action, lanPort, rate | - | - |  |
| `portmaptime` | write | sdk_void |  |  | tcpTimeoutSeconds, udpTimeoutSeconds, igmpTimeoutSeconds, tcpWwwTimeoutSeconds, tcpSynTimeoutSeconds | - | - |  |
| `qos_setdefault` | write | sdk_void | yes |  | - | - | - |  |
| `radius_authport` | write | sdk_void |  |  | port | - | - |  |
| `radius_client_add` | write | sdk_void |  |  | index, ipv4Address, ipv4Mask, ipv6Prefix, ipv6PrefixLength, secret | - | secret |  |
| `radius_client_del` | write | sdk_void |  |  | index | - | - |  |
| `radius_enable` | write | sdk_void |  |  | enabled | - | - |  |
| `radius_enabledot1x` | write | sdk_void |  |  | enabled | - | - |  |
| `radius_external` | write | sdk_void |  |  | args | - | - |  |
| `radius_external_log` | read | sdk_void |  |  | profileIndex | - | - |  |
| `radius_external_view` | read | sdk_void |  |  | - | - | - |  |
| `radius_external_viewprofile` | read | sdk_void |  |  | profileIndex | - | - |  |
| `radius_setauthmethod` | write | sdk_void |  |  | methodIndex | - | - |  |
| `radius_setdot1xmethod` | write | sdk_void |  |  | action, methodIndex | - | - |  |
| `service` | read | sdk_void |  |  | - | - | - |  |
| `service_clear` | write | sdk_void | yes |  | - | - | - |  |
| `service_login` | write | sdk_void |  |  | account, password | - | password |  |
| `service_refresh` | read | sdk_void |  |  | - | - | - |  |
| `service_transfer` | write | sdk_void | yes |  | confirm | - | - |  |
| `service_transferowner` | write | sdk_void |  |  | newOwner, newOwnerEmail | - | - |  |
| `show_clienttraffic_device` | read | sdk_void |  |  | deviceIndex, interfaceLabel, direction, weekly | - | - |  |
| `show_ping` | read | sdk_void |  |  | wan, daily | - | - |  |
| `show_statistic_reset` | write | sdk_void |  |  | interfaceLabel | - | - |  |
| `show_traffic_ip` | read | sdk_void |  |  | ipv4Address, direction | - | - |  |
| `show_traffic_ipstats` | write | sdk_void |  |  | enabled | - | - |  |
| `show_traffic_session` | read | sdk_void |  |  | weekly | - | - |  |
| `show_traffic_wan` | read | sdk_void |  |  | wan, direction, weekly | - | - |  |
| `srv_dhcp_dhcp2` | write | sdk_void |  |  | action, enabled, portId | - | - |  |
| `srv_dhcp_expiredrecycleip` | write | sdk_void |  |  | seconds | - | - |  |
| `srv_dhcp_frcdnsmanl` | write | sdk_void |  |  | enabled | - | - |  |
| `srv_dhcp_ipcnt` | write | sdk_void |  |  | count | - | - |  |
| `srv_dhcp_nodetype` | write | sdk_void |  |  | nodeType | - | - |  |
| `srv_dhcp_option` | write | sdk_void |  |  | action, index, enabled, lan, optionNumber, value, nextServerIp | - | - |  |
| `srv_dhcp_primwins` | write | sdk_void |  |  | action, winsIp | - | - |  |
| `srv_dhcp_public_add` | write | sdk_void |  |  | mac | - | - |  |
| `srv_dhcp_public_cnt` | write | sdk_void |  |  | count | - | - |  |
| `srv_dhcp_public_del` | write | sdk_void |  |  | mac | - | - |  |
| `srv_dhcp_public_start` | write | sdk_void |  |  | startIp | - | - |  |
| `srv_dhcp_public_status` | read | sdk_void |  |  | - | - | - |  |
| `srv_dhcp_relay` | write | sdk_void |  |  | action, serverIp, index | - | - |  |
| `srv_dhcp_secwins` | write | sdk_void |  |  | action, winsIp | - | - |  |
| `srv_dhcp_status` | read | sdk_void |  |  | interfaceLabel | - | - |  |
| `srv_dhcp_tftp` | write | sdk_void |  |  | serverName | - | - |  |
| `srv_dhcp_tftpdel` | write | sdk_void |  |  | - | - | - |  |
| `srv_nat_ipsecpass` | write | sdk_void |  |  | action | - | - |  |
| `srv_nat_openport` | write | sdk_void |  |  | ruleIndex, subItem, enabled, comment, localIp, wanIndex, wanAliasIndex, protocol, startPort, endPort | - | - |  |
| `srv_nat_portmap` | write | sdk_void |  |  | action, index, serviceName, protocol, publicPort, sourceIpType, sourceIpIndex, privateIp, privatePort, wanIndex, aliasIpIndex | - | - |  |
| `srv_nat_pseudoctl` | write | sdk_void |  |  | action, threshold, mode | - | - |  |
| `srv_nat_rsttimeout` | write | sdk_void |  |  | value | - | - |  |
| `srv_nat_showall` | read | sdk_void |  |  | - | - | - |  |
| `srv_nat_status` | read | sdk_void |  |  | - | - | - |  |
| `srv_nat_trigger` | write | sdk_void |  |  | action, rule, comment, enabled, ipType, protocol, port | - | - |  |
| `switch_clear` | write | sdk_void |  |  | index, all | - | - |  |
| `switch_i` | write | sdk_void |  |  | index, traffic | - | - |  |
| `switch_notrespond` | write | sdk_void |  |  | enabled | - | - |  |
| `switch_syslog` | write | sdk_void |  |  | enabled | - | - |  |
| `swm_enable_disable` | write | sdk_void |  |  | action | - | - |  |
| `sys_adminuser` | write | sdk_void |  |  | target, enabled, index, username, password | - | password |  |
| `sys_arpautoreq` | write | sdk_void |  |  | enabled | - | - |  |
| `sdk_sys_autoreboot` | write | sdk_void |  |  | input | - | - |  |
| `sys_board` | write | sdk_void |  |  | target, enabled, minutes, port | - | - |  |
| `sys_bonjour` | write | sdk_void |  |  | serviceEnabled, httpEnabled, telnetEnabled, ftpEnabled, sshEnabled, printerEnabled, ipv6Enabled | - | - |  |
| `sys_cfg_default` | write | sdk_void | yes |  | - | - | - |  |
| `sys_cfg_status` | read | sdk_void |  |  | - | - | - |  |
| `sys_con2tel` | write | sdk_void |  |  | - | - | - |  |
| `sys_dashboard_set` | write | sdk_void |  |  | sections | - | - |  |
| `sys_dashboard_show` | read | sdk_void |  |  | - | - | - |  |
| `sys_daylightsave` | write | sdk_void |  |  | enabled, show, reset | - | - |  |
| `sys_eaptls` | write | sdk_void |  |  | enabled | - | - |  |
| `sys_ftpd` | write | sdk_void |  |  | enabled | - | - |  |
| `sys_iface` | read | sdk_void |  |  | - | - | - |  |
| `sys_ipfixnetflow` | write | sdk_void |  |  | setting, enabled, address, port, protocol, version, seconds | - | - |  |
| `sys_ipfixnetflow_status` | read | sdk_void |  |  | - | - | - |  |
| `sys_maxsession_set` | write | sdk_void |  |  | value | - | - |  |
| `sys_mpage` | write | sdk_void |  |  | enabled | - | - |  |
| `sys_pollbuf_off` | write | sdk_void |  |  | - | - | - |  |
| `sys_pollbuf_on` | write | sdk_void |  |  | - | - | - |  |
| `sys_pwenc` | write | sdk_void |  |  | enabled | - | - |  |
| `sys_rtspalg` | write | sdk_void |  |  | enabled, port, udpPathEnabled, tcpPathEnabled, showPortmap | - | - |  |
| `sys_sipalg` | write | sdk_void |  |  | enabled, port, udpPathEnabled, tcpPathEnabled | - | - |  |
| `sys_time_inquire` | write | sdk_void |  |  | - | - | - |  |
| `sys_time_pseudo` | write | sdk_void |  |  | - | - | - |  |
| `sys_time_server` | write | sdk_void |  |  | domain | - | - |  |
| `sys_time_show` | read | sdk_void |  |  | - | - | - |  |
| `sys_time_wan` | write | sdk_void |  |  | wan | - | - |  |
| `sys_time_zone` | write | sdk_void |  |  | index | - | - |  |
| `upnp_service` | read | sdk_void |  |  | - | - | - |  |
| `upnp_subscribe` | read | sdk_void |  |  | - | - | - |  |
| `upnp_tmpvs` | read | sdk_void |  |  | - | - | - |  |
| `upnp_wan` | write | sdk_void |  |  | wanIndex | - | - |  |
| `usb_ftpusage` | read | sdk_void |  |  | - | - | - |  |
| `usb_user_disable` | write | sdk_void |  |  | index | - | - |  |
| `usb_user_enable` | write | sdk_void |  |  | index | - | - |  |
| `usb_user_list` | read | sdk_void |  |  | - | - | - |  |
| `usb_user_rm` | write | sdk_void |  |  | index | - | - |  |
| `user` | write | sdk_void |  |  | action, param, profileIdx, userName | - | param, userName |  |
| `vigbrg_cfgip` | write | sdk_void |  |  | ip | - | - |  |
| `vigbrg_closeall` | write | sdk_void |  |  | - | - | - |  |
| `vlan_map` | read | sdk_void |  |  | - | - | - |  |
| `vlan_pri` | write | sdk_void |  |  | vlanId, priority | - | - |  |
| `vlan_restart` | write | sdk_void |  |  | - | - | - |  |
| `vlan_submode_off` | write | sdk_void |  |  | - | - | - |  |
| `vlan_submode_on` | write | sdk_void |  |  | - | - | - |  |
| `vlan_submode_status` | read | sdk_void |  |  | - | - | - |  |
| `vlan_subnet` | write | sdk_void |  |  | lanInterface | - | - |  |
| `vlan_sysvid` | write | sdk_void |  |  | mode, value | - | - |  |
| `vlan_tagged` | write | sdk_void |  |  | target, channel, state | - | - |  |
| `vlan_vid` | write | sdk_void |  |  | channel, vid | - | - |  |
| `vpn_dinset` | write | sdk_void |  |  | index, param | - | - |  |
| `vpn_dpdkctrl_dump` | read | sdk_void |  |  | table | - | - |  |
| `vpn_dpdkctrl_flush` | write | sdk_void | yes |  | table | - | - |  |
| `vpn_dpdkctrl_set` | write | sdk_void |  |  | feature, enabled, mode | - | - |  |
| `vpn_fromlan_add` | write | sdk_void |  |  | lan | - | - |  |
| `vpn_fromlan_disable` | write | sdk_void |  |  | - | - | - |  |
| `vpn_fromlan_enable` | write | sdk_void |  |  | - | - | - |  |
| `vpn_fromlan_remove` | write | sdk_void |  |  | lan | - | - |  |
| `vpn_fromlan_status` | read | sdk_void |  |  | - | - | - |  |
| `vpn_ike` | read | sdk_void |  |  | flag | - | - |  |
| `vpn_isolate` | write | sdk_void |  |  | state | - | - |  |
| `vpn_l2ldialout` | write | sdk_void |  |  | index | - | - |  |
| `vpn_l2ldrop` | write | sdk_void |  |  | param | - | - |  |
| `vpn_l2lset` | write | sdk_void |  |  | index, param | - | - |  |
| `vpn_list_profile` | read | sdk_void |  |  | index, section | - | - |  |
| `vpn_mfa` | write | sdk_void |  |  | duration | - | - |  |
| `vpn_mirror` | write | sdk_void |  |  | scope, index | - | - |  |
| `vpn_mroute_add` | write | sdk_void |  |  | index, network | - | - |  |
| `vpn_mroute_addmsa` | write | sdk_void |  |  | index, localNetwork, remoteNetwork | - | - |  |
| `vpn_mroute_del` | write | sdk_void |  |  | index, network | - | - |  |
| `vpn_mroute_delmsa` | write | sdk_void |  |  | index, localNetwork, remoteNetwork | - | - |  |
| `vpn_mroute_list` | read | sdk_void |  |  | index | - | - |  |
| `vpn_mss_default` | write | sdk_void |  |  | - | - | - |  |
| `vpn_mss_set` | write | sdk_void |  |  | connectionType, mss | - | - |  |
| `vpn_mss_show` | read | sdk_void |  |  | - | - | - |  |
| `vpn_multicast` | write | sdk_void |  |  | scope, index, mode | - | - |  |
| `vpn_netbios` | write | sdk_void |  |  | scope, index, mode | - | - |  |
| `vpn_option` | write | sdk_void |  |  | index, param | - | - |  |
| `vpn_pass2nat` | write | sdk_void |  |  | state | - | - |  |
| `vpn_pass2nd` | write | sdk_void |  |  | state | - | - |  |
| `vpn_passapm` | write | sdk_void |  |  | enabled | - | - |  |
| `vpn_remote_set` | write | sdk_void |  |  | service, wanInterface, enabled | - | - |  |
| `vpn_samesubnet` | write | sdk_void |  |  | param | - | - |  |
| `vpn_subnet` | write | sdk_void |  |  | index, lan | - | - |  |
| `vpn_trunk` | write | sdk_void |  |  | param | - | - |  |
| `vpn_udp` | write | sdk_void |  |  | action, remoteIp, remotePort, localPort, serverIp, serverPort, enabled, host | - | - |  |
| `vpn_wg_enable` | write | sdk_void |  |  | enabled | - | - |  |
| `vpn_wg_interface` | write | sdk_void |  |  | listenPort, address, mtu | - | - |  |
| `vpn_wg_keygen` | write | sdk_void | yes |  | - | - | - |  |
| `vpn_wg_keyset` | write | sdk_void | yes |  | privateKey | - | privateKey |  |
| `vpn_wg_peer` | write | sdk_void |  |  | index, action, key, allowedIps, seconds | - | - |  |
| `vpn_wg_show` | read | sdk_void |  |  | - | - | - |  |
| `wan_budget_status` | read | sdk_void |  |  | - | - | - |  |
| `sdk_wan_detect` | read | sdk_void |  |  | - | - | - |  |
| `wan_detect_interval` | write | sdk_void |  |  | wanInterface, value | - | - |  |
| `wan_detect_mode` | write | sdk_void |  |  | wanInterface, mode, timeSeconds, intervalSeconds | - | - |  |
| `wan_detect_retry` | write | sdk_void |  |  | wanInterface, value | - | - |  |
| `wan_detect_target` | write | sdk_void |  |  | wanInterface, ipv4Address | - | - |  |
| `wan_detect_target2` | write | sdk_void |  |  | wanInterface, ipv4Address | - | - |  |
| `wan_detect_targetgw` | write | sdk_void |  |  | wanInterface, enabled | - | - |  |
| `wan_detect_ttl` | write | sdk_void |  |  | wanInterface, value | - | - |  |
| `wan_detect2` | write | sdk_void |  |  | settings | - | - |  |
| `wan_detect2_result` | read | sdk_void |  |  | - | - | - |  |
| `wan_detect2_show` | read | sdk_void |  |  | - | - | - |  |
| `wan_dfcheck` | write | sdk_void |  |  | enabled | - | - |  |
| `wan_dpdkport` | write | sdk_void |  |  | wanNo, portId | - | - |  |
| `wan_drop` | write | sdk_void | yes |  | wanInterface | - | - |  |
| `wan_lb_mode` | write | sdk_void |  |  | mode | - | - |  |
| `wan_lb_status` | read | sdk_void |  |  | - | - | - |  |
| `wan_lbel` | write | sdk_void |  |  | index, enabled, protocol, ipType, objectOrGroupIndex, portStart, portEnd, comment | - | - |  |
| `wan_lbel_status` | read | sdk_void |  |  | index | - | - |  |
| `wan_lbweight` | write | sdk_void |  |  | settings | - | - |  |
| `wan_lbweight_status` | read | sdk_void |  |  | - | - | - |  |
| `wan_multifno` | write | sdk_void |  |  | channel, wanInterface | - | - |  |
| `wan_multifno_status` | read | sdk_void |  |  | - | - | - |  |
| `wan_mvlan` | write | sdk_void |  |  | pvcNo, state, ports | - | - |  |
| `wan_phymode` | write | sdk_void | yes |  | wanNo, mode | - | - |  |
| `wan_phymode_status` | read | sdk_void |  |  | - | - | - |  |
| `wan_pppmru` | write | sdk_void |  |  | wanInterface, mruSize | - | - |  |
| `wan_vlan_stat` | read | sdk_void |  |  | - | - | - |  |
| `wan_voipdect` | write | sdk_void |  |  | option, enabled, mos, wan | - | - |  |
| `wan_voipdect_rtp` | read | sdk_void |  |  | - | - | - |  |
| `wan_voipdect_view` | read | sdk_void |  |  | - | - | - |  |
| `wol_fromwan` | write | sdk_void |  |  | mode | - | - |  |
| `wol_fromwansetting` | write | sdk_void |  |  | index, ipAddress, mask | - | - |  |

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
