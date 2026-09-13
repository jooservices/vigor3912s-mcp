# Vigor3912 CLI Command Map (DrayOS)

Source: Part VIII "Telnet Commands", `DrayTek_UG_Vigor3912_V1.01.pdf` (firmware **V4.3.5.1**). Full extracted text: `cli-reference-raw.txt` (327 command headings).

> **Runtime Truth**: command set is firmware-specific. Verify each command against the live device (`<cmd> ?`) during SSH recon before scripting it. Differences between firmware versions are common.

## Getting help (in CLI)

- `?` — list available commands
- `<cmd> ?` — syntax of a command
- `exit` / `quit` — log out

## Status & diagnostics (read-only, safe)

| Command | Purpose |
|---|---|
| `show status` | LAN + WAN connection status (DNS, IP, rates, uptime) |
| `show lan` / `show dmz` / `show dns` | LAN / DMZ / DNS view |
| `show openport` / `show nat` / `show portmap` / `show pmtime` | NAT / port mapping view |
| `show session` / `show traffic` / `show clienttraffic` / `show statistic` | sessions & traffic |
| `sys version` | Model, firmware, Router IP/netmask, build date, revision |
| `sys cmdlog` | Command history |
| `sys cc` | Country / wireless region code |
| `sys qrybuf` | Memory / buffer usage |
| `sys health` | System health |
| `wan status` | WAN connection mode, TX/RX, DNS, IP |
| `ip ping <ip>` / `ip tracert <ip>` / `ip6 ping` / `ip6 tracert` | Connectivity tests |

`show status` example output:
```
System Uptime:2:8:29
LAN Status
Primary DNS:168.95.192.1      Secondary DNS:168.95.1.1
IP Address:192.168.100.1      Tx Rate:103850    Rx Rate:68112
WAN 1 Status: Disconnected
Enable:Yes       Line:Fiber       Name:
Mode:DHCP Client Up Time:0:00:00     IP:---            GW IP:---
```

`sys version` example output:
```
Router Model: Vigor3912S    Version: 4.3.5 zh_TW zh_CN
Profile version: 4.0.7    Status: 1 (0x14bc0da9)
Router IP: 192.168.1.1    Netmask: 255.255.255.0
Firmware Build Date/Time: Nov 13 2023 16:38:20
Router Name: DrayTek
Revision: 3682_4564_a39c288 V400_RD3
```

## System (write — require confirm + commit)

| Command | Purpose |
|---|---|
| `sys passwd <old> <new>` | Change admin password (max 83 chars) |
| `sys reboot` | **Restart router immediately** |
| `sys autoreboot <on/off/hours>` | Scheduled auto-restart |
| `sys commit` | **Save current settings (SRAM) to FLASH** — run after CLI changes |
| `sys cfg status` | Show profile version + status (state marker) |
| `sys cfg default` | **Factory reset — destructive, do NOT run** |
| `sys name <name>` / `sys domainname` | Router name / domain |
| `sys tftpd` | Enable TFTP server (firmware upgrade) |
| `sys syslog` / `sys mailalert` / `sys webhook` | Logging / alerts |
| `sys tr069` / `sys license` / `sys alg` | TR-069 / license / ALG |

## Management / access (write — require confirm)

| Command | Purpose |
|---|---|
| `mngt sshport <port>` | Set SSH port (default 22) |
| `mngt telnetport` / `mngt httpport` / `mngt httpsport` / `mngt ftpport` / `mngt sslvpnport` | Set management ports |
| `mngt rmtcfg status` | Show remote-config status |
| `mngt rmtcfg enable` / `mngt rmtcfg disable` | Allow / deny management login **from Internet** |
| `mngt rmtcfg <http/https/ftp/telnet/ssh/tr069/snmp/enforce_https> on\|off` | Enable per-protocol remote management |
| `mngt lanaccess ...` | LAN management access control |
| `mngt accesslist` / `mngt wanlogin` / `mngt bfp` / `mngt snmp` | Access list / WAN login / brute-force protection / SNMP |
| `mngt noping` / `mngt echoicmp` / `mngt defenseworm` | Ping / ICMP / worm defense |
| `mngt telnettimeout` / `mngt sshtimeout` | Session timeouts |

## WAN (write — require confirm)

| Command | Purpose |
|---|---|
| `wan enable WAN<n>` / `wan disable` | Enable / disable a WAN interface |
| `wan status` | WAN status |
| `wan mtu` / `wan ppp_mru` / `wan dns` | MTU / PPP MRU / DNS |
| `wan detect` / `wan detect_mtu` / `wan detect_mtu6` | Connection detection |
| `wan lb` / `wan failover` / `wan forward <on/off>` | Load balance / failover / inter-WAN forwarding |
| `wan vlan` / `wan mvlan` | WAN VLAN tagging |
| `wan budget` | WAN data budget |

## LAN / DHCP / NAT (write — require confirm)

| Command | Purpose |
|---|---|
| `srv dhcp on` / `srv dhcp off` | DHCP server on/off — **requires `sys reboot`** |
| `srv dhcp dns1` / `dns2` / `gateway` / `startip` / `leasetime` / `status` | DHCP pool options |
| `srv dhcp relay servip <ip>` | DHCP relay |
| `srv nat dmz` | DMZ host |
| `srv nat openport` | Open ports |
| `srv nat portmap add <idx> <serv name> <proto> <pub port> <src ip type> <src ip idx> <pri ip> <pri port> <wan idx> <alias IP>` | **Add port redirection** (idx 1–260) |
| `srv nat portmap del <idx>` / `enable` / `disable` / `flush` / `table` / `view` | Portmap management |
| `srv nat trigger` | Port triggering |
| `ip lan` / `ip addr` / `ip nmask` / `ip pubaddr` / `ip lanalias` | IP / LAN addressing |
| `ip arp` / `ip dhcpc` / `ip route` / `ip session` / `ip bindmac` / `ip bandwidth` | ARP / DHCP client / routes / sessions / bind-IP-to-MAC / BW |
| `msubnet ...` | Multi-subnet LAN |
| `vlan group/on/off/status/vid/subnet/tagged/sysvid` | VLAN config |

## Objects & firewall

| Command | Purpose |
|---|---|
| `object ip obj` / `object ip grp` / `object ipv6 obj` / `object ipv6 grp` | IP objects/groups |
| `object service obj` / `object service grp` / `object country` / `object kw` / `object schedule` | Service/country/keyword/schedule objects |
| `ipf view` / `ipf set` / `ipf rule` / `ipf flowtrack` / `ipf flowtest` | IP filter rules |
| `dos` | DoS defense |

## VPN

| Command | Purpose |
|---|---|
| `vpn l2lset` / `vpn l2l` / `vpn dinset` / `vpn subnet` | LAN-to-LAN / dial-in profiles |
| `vpn setup` / `vpn option` / `vpn ike` | VPN core settings |
| `vpn list` / `vpn remote` / `vpn mroute` / `vpn trunk` | VPN status / remote users |
| `vpn ovpn` / `vpn dial_out` | OpenVPN / dial-out |
| `vpn fromlan` / `vpn isolate` / `vpn mfa` | Zero-trust / isolation / MFA |
| `radius internal` / `radius external` / `local_8021x` / `ldap ...` / `tacacsplus ...` | AAA backends |

## QoS / services / misc

| Command | Purpose |
|---|---|
| `qos setup` / `qos class` / `qos type` / `qos voip` / `appqos` | QoS classes & types |
| `ddns enable/set/log/time/forceupdate/setdefault/show` | Dynamic DNS |
| `upnp on/off/nat/service/subscribe/tmpvs/wan` | UPnP |
| `csm appe prof/set/show/config` | APP enforcement profiles (1–32) |
| `csm ucf` / `csm wcf` / `csm dnsf` | URL / web content / DNS filtering |
| `usb devstat` / `usb user` / `usb temp` | USB storage |
| `hsportal setup/info/level/pin_gen` | Hotspot portal |
| `wol` | Wake-on-LAN |
| `apm ...` / `swm ...` | AP / switch management |
| `ha set/show/status` | High availability |
| `vigbrg ...` | Vigor bridge |
| `service -s` / `-l` / `-i` / `-t` / `-c` | MyVigor service |

## Linux application (3912S) — path to run MCP on-device

| Command | Purpose |
|---|---|
| `linux setlinuxip -i <IP> -c <CIDR> -g <GW> [v VLANx] [-p <admin pw>]` | Set Linux app IP (1st time, reboot to apply) |
| `linux status` | Show Linux app status |
| `linux service ssh enable\|disable\|status\|setport <port>` | Control SSH to the Linux (Ubuntu) environment |
| `linux service telnet ...` | Control telnet to Linux environment |
| `linux syslog enable\|disable\|status` | Linux syslog |
| `linux clean -a/-b/-d/-o/-w` | Clean Linux app partition / wipe (`-w` wipes all) |
| `linux ring ...` | Linux ring/buffer ops |

`linux setlinuxip` example:
```
linux setlinuxip -i 192.168.1.2 -c 24 -g 192.168.1.1 -p <admin_password>
```

## Verified session flow (recon)

```
ssh admin@<LAN_IP>
sys version        # model, firmware, IP
show status        # WAN/LAN state
?                  # full command list for THIS firmware
<cmd> ?            # syntax per command
quit
```

## Danger list (never run)

- `sys cfg default` — factory reset (loses all config)
- `sys reboot` — without confirm; interrupts traffic
- `mngt rmtcfg enable` — exposes management to the Internet (LAN-only policy)
- `linux clean -w` / `-o` — wipes Linux apps / reboots