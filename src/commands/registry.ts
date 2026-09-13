import { z, type ZodRawShape } from 'zod';
import {
  parseArpStatus,
  parseDhcpStatus,
  parsePing,
  parseRouteStatus,
  parseShowStatus,
  parseSysVersion,
  parseWanStatus,
} from '../tools/parsers.js';

export type CommandKind = 'read' | 'write';

export interface CommandDef {
  id: string;
  family: string;
  kind: CommandKind;
  desc: string;
  /** Build the exact CLI string for the router from tool args. */
  render: (args: Record<string, unknown>) => string;
  /** zod schema for tool arguments (may be empty object for no-arg commands). */
  args: ZodRawShape;
  /** Whether this command changes network-affecting state (extra warning). */
  affectsNetwork?: boolean;
  /** Optional formatter to structure the raw CLI output (falls back to raw). */
  format?: (raw: string) => unknown;
  /** Read command id used to snapshot router state before/after this write. */
  snapshotRead?: string;
  /** Arg keys whose values must be redacted in logs (passwords, secrets). */
  secretArgs?: string[];
  /** High-risk write: requires `acknowledge: true` on the confirm call. */
  dangerous?: boolean;
  /** Do not auto-run `sys commit` after this write (e.g. reboot, test mail). */
  skipCommit?: boolean;
}

export interface FamilyDef {
  family: string;
  desc: string;
  commands: CommandDef[];
}

const ipv4 = z.string().ip({ version: 'v4' });
const wanIdx = z.number().int().min(1).max(12);
const onOff = z.enum(['on', 'off']);
const enableDisable = z.enum(['enable', 'disable']);
const oneZero = z.union([z.literal(0), z.literal(1)]);

/** Blocks control characters (incl. CR/LF/TAB) — prevents CLI line injection. */
const noControl = (max = 255) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((v) => !/[\x00-\x1f]/.test(v), {
      message: 'control characters are not allowed',
    });

/** Blocks control characters AND shell metacharacters for free-form params. */
const safeText = (max = 255) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((v) => !/[\x00-\x1f;|&`$]/.test(v), {
      message: 'control characters and shell metacharacters are not allowed',
    });

const R = (
  id: string,
  family: string,
  cli: string,
  desc: string,
  format?: (raw: string) => unknown,
): CommandDef => ({
  id,
  family,
  kind: 'read',
  desc,
  render: () => cli,
  args: {},
  ...(format ? { format } : {}),
});

const Ra = (
  id: string,
  family: string,
  render: CommandDef['render'],
  args: ZodRawShape,
  desc: string,
  format?: (raw: string) => unknown,
): CommandDef => ({
  id,
  family,
  kind: 'read',
  render,
  args,
  desc,
  ...(format ? { format } : {}),
});

const W = (
  id: string,
  family: string,
  render: CommandDef['render'],
  args: ZodRawShape,
  desc: string,
  affectsNetwork = false,
  extra?: Partial<Pick<CommandDef, 'snapshotRead' | 'secretArgs' | 'dangerous' | 'skipCommit'>>,
): CommandDef => ({ id, family, kind: 'write', render, args, desc, affectsNetwork, ...extra });

/** Full command registry, built from live recon (fw 4.4.7_RC2) + command map. */
export const REGISTRY: FamilyDef[] = [
  {
    family: 'show',
    desc: 'Status and diagnostics views (read-only).',
    commands: [
      R('show_status', 'show', 'show status', 'System uptime, LAN DNS, IP, per-WAN link status', parseShowStatus),
      R('show_lan', 'show', 'show lan', 'LAN/VLAN interfaces: IP, mask, DHCP pool, gateway'),
      R('show_dmz', 'show', 'show dmz', 'DMZ host configuration'),
      R('show_dns', 'show', 'show dns', 'DNS server settings per LAN'),
      R('show_openport', 'show', 'show openport', 'Opened ports (NAT)'),
      R('show_nat', 'show', 'show nat', 'NAT port redirection running table'),
      R('show_portmap', 'show', 'show portmap', 'Port mapping table'),
      R('show_pmtime', 'show', 'show pmtime', 'Port mapping timeout settings'),
      R('show_session', 'show', 'show session', 'Session usage statistics'),
      R('show_traffic', 'show', 'show traffic', 'Traffic statistics'),
      R('show_clienttraffic', 'show', 'show clienttraffic', 'Per-client traffic statistics'),
      R('show_cpu', 'show', 'show cpu', 'CPU usage'),
      R('show_memory', 'show', 'show memory', 'Memory usage'),
      R('show_cocpu', 'show', 'show cocpu', 'Co-processor usage'),
      R('show_cputemp', 'show', 'show cputemp', 'CPU temperature'),
      R('show_statistic', 'show', 'show statistic', 'Interface statistics'),
      R('show_flow', 'show', 'show flow', 'Flow tracking view'),
      R('show_voip', 'show', 'show voip', 'VoIP status'),
      R('show_qryrdsl', 'show', 'show qryrdsl', 'Query ADSL/VDSL line info'),
    ],
  },
  {
    family: 'sys',
    desc: 'System-level commands (mix of read and write).',
    commands: [
      R('sys_version', 'sys', 'sys version', 'Router model, firmware version, IP, build date', parseSysVersion),
      R('sys_cmdlog', 'sys', 'sys cmdlog', 'Command history'),
      R('sys_cc', 'sys', 'sys cc', 'Country / wireless region code'),
      R('sys_qrybuf', 'sys', 'sys qrybuf', 'Memory / buffer usage'),
      R('sys_pollbuf', 'sys', 'sys pollbuf', 'Poll buffer usage'),
      R('sys_health', 'sys', 'sys health', 'System health'),
      R('sys_info', 'sys', 'sys info', 'System information'),
      R('sys_fr_log', 'sys', 'sys fr_log', 'Failure-related log'),
      R('sys_max_session', 'sys', 'sys max_session', 'Maximum session configuration'),
      R('sys_app_statistic', 'sys', 'sys app_statistic', 'Application statistics'),
      R('sys_app_bandwidth', 'sys', 'sys app_bandwidth', 'Application bandwidth usage'),
      R('sys_time', 'sys', 'sys time', 'System time'),
      R('sys_dnsCacheTbl', 'sys', 'sys dnsCacheTbl', 'DNS cache table'),
      R('sys_dashboard', 'sys', 'sys dashboard', 'Dashboard summary'),
      W('sys_passwd', 'sys', (a) => `sys passwd ${String(a.old)} ${String(a.new)}`, {
        old: noControl(),
        new: noControl(83),
      }, 'Change the admin password', false, { secretArgs: ['old', 'new'], dangerous: true }),
      W('sys_name', 'sys', (a) => `sys name ${String(a.name)}`, { name: safeText(63) }, 'Set router name'),
      W('sys_domainname', 'sys', (a) => `sys domainname ${String(a.domain)}`, { domain: safeText() }, 'Set router domain name'),
      W('sys_commit', 'sys', () => 'sys commit', {}, 'Save running settings (SRAM) to FLASH', false, { skipCommit: true }),
      W('sys_reboot', 'sys', () => 'sys reboot', {}, 'Restart the router immediately', true, { dangerous: true, skipCommit: true }),
      W('sys_autoreboot', 'sys', (a) => {
        const mode = a.mode;
        if (mode === 'hours' && a.hours == null) {
          throw new Error('hours is required when mode=hours');
        }
        return `sys autoreboot ${mode === 'off' ? 'off' : String(a.hours)}`;
      }, {
        mode: z.enum(['off', 'hours']),
        hours: z.number().int().min(1).max(168).optional(),
      }, 'Configure scheduled auto-restart (mode=hours requires hours param)'),
      W('sys_tftpd', 'sys', (a) => `sys tftpd ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable TFTP server for firmware upgrade'),
      W('sys_syslog', 'sys', (a) => `sys syslog ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable syslog'),
      W('sys_mailalert', 'sys', (a) => `sys mailalert ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable mail alert'),
      W('sys_webhook', 'sys', (a) => `sys webhook ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable webhook'),
      W('sys_tr069', 'sys', (a) => `sys tr069 ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable TR-069'),
      W('sys_alg', 'sys', (a) => `sys alg ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable ALG'),
      W('sys_license', 'sys', (a) => `sys license ${String(a.action)}`, { action: safeText() }, 'License operations'),
    ],
  },
  {
    family: 'wan',
    desc: 'WAN interface configuration and status.',
    commands: [
      R('wan_status', 'wan', 'wan status', 'Per-WAN link state, mode, IP, gateway, traffic, DNS', parseWanStatus),
      R('wan_detect', 'wan', 'wan detect', 'WAN connection detection status'),
      R('wan_detect_mtu', 'wan', 'wan detect_mtu', 'WAN MTU detection status'),
      R('wan_detect_mtu6', 'wan', 'wan detect_mtu6', 'IPv6 WAN MTU detection status'),
      W('wan_enable', 'wan', (a) => `wan enable WAN${a.wan}`, { wan: wanIdx }, 'Enable a WAN interface', true, { snapshotRead: 'wan_status', dangerous: true }),
      W('wan_disable', 'wan', (a) => `wan disable WAN${a.wan}`, { wan: wanIdx }, 'Disable a WAN interface', true, { snapshotRead: 'wan_status', dangerous: true }),
      W('wan_mtu', 'wan', (a) => `wan mtu WAN${a.wan} ${a.mtu}`, { wan: wanIdx, mtu: z.number().int().min(576).max(1500) }, 'Set WAN MTU'),
      W('wan_dns', 'wan', (a) => `wan dns WAN${a.wan} ${a.primary} ${a.secondary ?? ''}`.trim(), {
        wan: wanIdx,
        primary: ipv4,
        secondary: ipv4.optional(),
      }, 'Set WAN DNS servers'),
      W('wan_forward', 'wan', (a) => `wan forward ${a.onoff}`, { onoff: onOff }, 'Enable/disable inter-WAN forwarding'),
      W('wan_failover', 'wan', (a) => `wan failover ${String(a.param)}`, { param: safeText() }, 'Configure WAN failover'),
      W('wan_lb', 'wan', (a) => `wan lb ${String(a.param)}`, { param: safeText() }, 'Configure WAN load balancing'),
      W('wan_budget', 'wan', (a) => `wan budget ${String(a.param)}`, { param: safeText() }, 'Configure WAN data budget'),
      W('wan_vlan', 'wan', (a) => `wan vlan WAN${a.wan} ${a.vid}`, { wan: wanIdx, vid: z.number().int().min(1).max(4094) }, 'Set WAN VLAN tag'),
    ],
  },
  {
    family: 'srv',
    desc: 'DHCP and NAT services.',
    commands: [
      R('dhcp_status', 'srv', 'srv dhcp status', 'DHCP server status + lease/reservation table', parseDhcpStatus),
      R('nat_view', 'srv', 'srv nat view', 'NAT configuration view'),
      W('dhcp_on', 'srv', () => 'srv dhcp on', {}, 'Enable DHCP server (requires reboot to apply)', true, { dangerous: true }),
      W('dhcp_off', 'srv', () => 'srv dhcp off', {}, 'Disable DHCP server (requires reboot to apply)', true, { dangerous: true }),
      W('dhcp_startip', 'srv', (a) => `srv dhcp startip LAN${a.lan} ${a.start} ${a.count}`, {
        lan: z.number().int().min(1).max(8),
        start: ipv4,
        count: z.number().int().min(1).max(254),
      }, 'Set DHCP start IP and pool count', true, { snapshotRead: 'dhcp_status' }),
      W('dhcp_gateway', 'srv', (a) => `srv dhcp gateway LAN${a.lan} ${a.gateway}`, {
        lan: z.number().int().min(1).max(8),
        gateway: ipv4,
      }, 'Set DHCP pool gateway', true, { snapshotRead: 'dhcp_status' }),
      W('dhcp_dns1', 'srv', (a) => `srv dhcp dns1 LAN${a.lan} ${a.dns}`, {
        lan: z.number().int().min(1).max(8),
        dns: ipv4,
      }, 'Set DHCP primary DNS'),
      W('dhcp_dns2', 'srv', (a) => `srv dhcp dns2 LAN${a.lan} ${a.dns}`, {
        lan: z.number().int().min(1).max(8),
        dns: ipv4,
      }, 'Set DHCP secondary DNS'),
      W('dhcp_leasetime', 'srv', (a) => `srv dhcp leasetime LAN${a.lan} ${a.seconds}`, {
        lan: z.number().int().min(1).max(8),
        seconds: z.number().int().min(120).max(604800),
      }, 'Set DHCP lease time'),
      W('nat_dmz', 'srv', (a) => `srv nat dmz LAN${a.lan} ${a.host}`, {
        lan: z.number().int().min(1).max(8),
        host: ipv4,
      }, 'Set DMZ host', true),
    ],
  },
  {
    family: 'ip',
    desc: 'IP, routing, ARP, diagnostics.',
    commands: [
      R('ip_route_status', 'ip', 'ip route status', 'Routing table (connected/static/default)', parseRouteStatus),
      R('ip_arp_status', 'ip', 'ip arp status', 'ARP table', parseArpStatus),
      Ra('ip_ping', 'ip', (a) => `ip ping ${String(a.host)}`, { host: ipv4 }, 'Ping an IPv4 host (5 packets)', (raw) => parsePing(raw, '')),
      Ra('ip_tracert', 'ip', (a) => `ip tracert ${String(a.host)}`, { host: ipv4 }, 'Traceroute to an IPv4 host'),
      R('ip_session', 'ip', 'ip session', 'IP session table'),
      R('ip_dnsforward', 'ip', 'ip dnsforward', 'DNS forward table'),
      R('ip_lanDNSRes', 'ip', 'ip lanDNSRes', 'LAN DNS resolution cache'),
      W('ip_addr', 'ip', (a) => `ip addr LAN${a.lan} ${a.ip}`, { lan: z.number().int().min(1).max(8), ip: ipv4 }, 'Set LAN IP', true),
      W('ip_nmask', 'ip', (a) => `ip nmask LAN${a.lan} ${a.mask}`, {
        lan: z.number().int().min(1).max(8),
        mask: z.string().regex(/^255\./),
      }, 'Set LAN netmask', true),
      W('ip_route_add', 'ip', (a) => `ip route add ${a.dest} ${a.mask} ${a.gw}`, {
        dest: ipv4,
        mask: ipv4,
        gw: ipv4,
      }, 'Add a static route', true, { snapshotRead: 'ip_route_status' }),
      W('ip_route_del', 'ip', (a) => `ip route del ${a.dest} ${a.mask}`, {
        dest: ipv4,
        mask: ipv4,
      }, 'Delete a static route', true, { snapshotRead: 'ip_route_status' }),
      W('ip_bindmac', 'ip', (a) => `ip bindmac ${a.ip} ${a.mac}`, {
        ip: ipv4,
        mac: z.string().regex(/^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/),
      }, 'Bind IP to MAC address'),
    ],
  },
  {
    family: 'mngt',
    desc: 'Management/access control (write).',
    commands: [
      W('mngt_sshport', 'mngt', (a) => `mngt sshport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set SSH port', false, { dangerous: true }),
      W('mngt_telnetport', 'mngt', (a) => `mngt telnetport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set telnet port'),
      W('mngt_httpport', 'mngt', (a) => `mngt httpport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set HTTP port'),
      W('mngt_httpsport', 'mngt', (a) => `mngt httpsport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set HTTPS port'),
      W('mngt_sshtimeout', 'mngt', (a) => `mngt sshtimeout ${a.minutes}`, { minutes: z.number().int().min(1).max(65535) }, 'Set SSH session timeout'),
      W('mngt_telnettimeout', 'mngt', (a) => `mngt telnettimeout ${a.minutes}`, { minutes: z.number().int().min(1).max(65535) }, 'Set telnet session timeout'),
      W('mngt_noping', 'mngt', (a) => `mngt noping ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable ping response'),
      W('mngt_defenseworm', 'mngt', (a) => `mngt defenseworm ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable worm defense'),
      W('mngt_bfp', 'mngt', (a) => `mngt bfp ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable brute-force protection'),
    ],
  },
  {
    family: 'linux',
    desc: '3912S Linux application (Ubuntu container) management.',
    commands: [
      R('linux_status', 'linux', 'linux status', 'Linux application status'),
      W('linux_ssh_enable', 'linux', () => 'linux service ssh enable', {}, 'Enable SSH service to the Linux environment'),
      W('linux_ssh_disable', 'linux', () => 'linux service ssh disable', {}, 'Disable SSH service to the Linux environment'),
      W('linux_ssh_port', 'linux', (a) => `linux service ssh setport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set SSH port for the Linux environment'),
      W('linux_setlinuxip', 'linux', (a) => `linux setlinuxip -i ${a.ip} -c ${a.cidr} -g ${a.gateway}`, {
        ip: ipv4,
        cidr: z.number().int().min(1).max(30),
        gateway: ipv4,
      }, 'Set Linux app IP (first time; reboot to apply)', true),
    ],
  },
  {
    family: 'port',
    desc: 'Ethernet port settings.',
    commands: [
      R('port_status', 'port', 'port status', 'Ethernet port status'),
      R('port_sniff_status', 'port', 'port sniff status', 'Port sniffing status'),
      W('port_speed', 'port', (a) => `port ${a.port} ${a.speed}`, {
        port: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'all']),
        speed: z.enum(['AN', '100F', '100H', '10F', '10H']),
      }, 'Set ethernet port speed/duplex', true),
    ],
  },
  {
    family: 'ddns',
    desc: 'Dynamic DNS.',
    commands: [
      R('ddns_show', 'ddns', 'ddns show', 'DDNS configuration'),
      R('ddns_log', 'ddns', 'ddns log', 'DDNS log'),
      W('ddns_enable', 'ddns', (a) => `ddns enable ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable DDNS'),
      W('ddns_forceupdate', 'ddns', () => 'ddns forceupdate', {}, 'Force DDNS update'),
    ],
  },
  {
    family: 'ipf',
    desc: 'IP filter (firewall).',
    commands: [
      R('ipf_view', 'ipf', 'ipf view', 'IP filter rules view'),
      W('ipf_set', 'ipf', (a) => `ipf set ${String(a.param)}`, { param: safeText() }, 'Set IP filter option'),
      W('ipf_rule', 'ipf', (a) => `ipf rule ${String(a.param)}`, { param: safeText() }, 'Manage IP filter rules'),
    ],
  },
  {
    family: 'vpn',
    desc: 'VPN configuration (mostly write).',
    commands: [
      R('vpn_list', 'vpn', 'vpn list', 'VPN profile list'),
      R('vpn_remote', 'vpn', 'vpn remote', 'Remote VPN users'),
      R('vpn_graph', 'vpn', 'vpn graph', 'VPN graph status'),
      W('vpn_setup', 'vpn', (a) => `vpn setup ${a.index} ${String(a.param)}`, {
        index: z.number().int().min(1).max(128),
        param: safeText(),
      }, 'Configure a VPN profile', true),
      W('vpn_ovpn', 'vpn', (a) => `vpn ovpn ${String(a.param)}`, { param: safeText() }, 'OpenVPN configuration', true),
      W('vpn_dial_out', 'vpn', (a) => `vpn dial_out ${String(a.param)}`, { param: safeText() }, 'VPN dial-out configuration', true),
    ],
  },
  {
    family: 'qos',
    desc: 'QoS configuration (write).',
    commands: [
      W('qos_setup', 'qos', (a) => `qos setup ${String(a.param)}`, { param: safeText() }, 'Configure QoS', true),
      W('qos_class', 'qos', (a) => `qos class ${String(a.param)}`, { param: safeText() }, 'Configure QoS class', true),
    ],
  },
  {
    family: 'dos',
    desc: 'DoS defense.',
    commands: [
      R('dos_view', 'dos', 'dos -V', 'View DoS defense configuration'),
      R('dos_blacklist_show', 'dos', 'dos -B show', 'Show DoS blocking list'),
      R('dos_whitelist_show', 'dos', 'dos -P show', 'Show DoS passing (white) list'),
      W('dos_activate', 'dos', () => 'dos -A', {}, 'Activate DoS defense system', true),
      W('dos_deactivate', 'dos', () => 'dos -D', {}, 'Deactivate DoS defense system', true),
    ],
  },
  {
    family: 'internet',
    desc: 'Internet access profile (WAN setup).',
    commands: [
      R('internet_view', 'internet', 'internet -V', 'View Internet access profile'),
      W('internet_set', 'internet', (a) => `internet -W ${a.wan} -M ${a.mode}${a.username ? ` -u ${a.username}` : ''}${a.password ? ` -p ${a.password}` : ''}`, {
        wan: wanIdx,
        mode: z.number().int().min(0).max(7),
        username: noControl(49).optional(),
        password: noControl(49).optional(),
      }, 'Set WAN internet access mode (PPPoE/DHCP/static/...)', true, { secretArgs: ['password'], dangerous: true }),
    ],
  },
  {
    family: 'ha',
    desc: 'High availability.',
    commands: [
      R('ha_show', 'ha', 'ha show', 'HA configuration'),
      R('ha_status', 'ha', 'ha status', 'HA status'),
      W('ha_set', 'ha', (a) => `ha set ${String(a.param)}`, { param: safeText() }, 'Configure HA', true),
    ],
  },
  {
    family: 'vrrp',
    desc: 'VRRP.',
    commands: [
      R('vrrp_show', 'vrrp', 'vrrp show', 'VRRP configuration'),
      W('vrrp_enable', 'vrrp', (a) => `vrrp enable ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable VRRP', true),
      W('vrrp_set', 'vrrp', (a) => `vrrp set ${String(a.param)}`, { param: safeText() }, 'Configure VRRP', true),
      W('vrrp_apply', 'vrrp', () => 'vrrp apply', {}, 'Apply VRRP configuration'),
      W('vrrp_reset', 'vrrp', () => 'vrrp reset', {}, 'Reset VRRP'),
    ],
  },
  {
    family: 'vigbrg',
    desc: 'Vigor bridge.',
    commands: [
      R('vigbrg_status', 'vigbrg', 'vigbrg status', 'Vigor bridge status'),
      R('vigbrg_wanstatus', 'vigbrg', 'vigbrg wanstatus', 'Vigor bridge WAN status'),
      R('vigbrg_wlanstatus', 'vigbrg', 'vigbrg wlanstatus', 'Vigor bridge wireless status'),
      W('vigbrg_set', 'vigbrg', (a) => `vigbrg set ${String(a.param)}`, { param: safeText() }, 'Configure Vigor bridge', true),
    ],
  },
  {
    family: 'vlan',
    desc: 'VLAN configuration.',
    commands: [
      R('vlan_status', 'vlan', 'vlan status', 'VLAN status'),
      W('vlan_on', 'vlan', () => 'vlan on', {}, 'Enable VLAN', true),
      W('vlan_off', 'vlan', () => 'vlan off', {}, 'Disable VLAN', true),
      W('vlan_group', 'vlan', (a) => `vlan group ${String(a.param)}`, { param: safeText() }, 'Configure VLAN group', true),
    ],
  },
  {
    family: 'switch',
    desc: 'Switch management.',
    commands: [
      R('switch_status', 'switch', 'switch status', 'Switch status'),
      R('switch_list', 'switch', 'switch list', 'Switch port list'),
      R('switch_query', 'switch', 'switch query', 'Switch query'),
      W('switch_on', 'switch', (a) => `switch on ${String(a.param)}`, { param: safeText() }, 'Enable switch feature'),
      W('switch_off', 'switch', (a) => `switch off ${String(a.param)}`, { param: safeText() }, 'Disable switch feature'),
    ],
  },
  {
    family: 'apm',
    desc: 'AP management.',
    commands: [
      R('apm_show', 'apm', 'apm show', 'AP management status'),
      R('apm_query', 'apm', 'apm query', 'AP query'),
      R('apm_stanum', 'apm', 'apm stanum', 'AP station number'),
      W('apm_enable', 'apm', () => 'apm enable', {}, 'Enable AP management'),
      W('apm_disable', 'apm', () => 'apm disable', {}, 'Disable AP management'),
    ],
  },
  {
    family: 'dpdk',
    desc: 'DPDK (data plane) diagnostics.',
    commands: [
      R('dpdk_statistic', 'dpdk', 'dpdk statistic', 'DPDK statistics'),
      R('dpdk_cmdlog', 'dpdk', 'dpdk cmdlog', 'DPDK command log'),
    ],
  },
  {
    family: 'nand',
    desc: 'NAND storage diagnostics.',
    commands: [
      R('nand_usage', 'nand', 'nand usage', 'NAND storage usage'),
      R('nand_bad', 'nand', 'nand bad', 'NAND bad blocks'),
    ],
  },
  {
    family: 'usb',
    desc: 'USB storage.',
    commands: [
      R('usb_devstat', 'usb', 'usb devstat', 'USB device status'),
      R('usb_disk', 'usb', 'usb disk', 'USB disk info'),
      R('usb_temp', 'usb', 'usb temp', 'USB temperature'),
    ],
  },
  {
    family: 'hsportal',
    desc: 'Hotspot portal.',
    commands: [
      R('hsportal_info', 'hsportal', 'hsportal info', 'Hotspot portal info'),
      R('hsportal_level', 'hsportal', 'hsportal level', 'Hotspot portal level'),
      W('hsportal_setup', 'hsportal', (a) => `hsportal setup ${String(a.param)}`, { param: safeText() }, 'Configure hotspot portal'),
    ],
  },
  {
    family: 'log',
    desc: 'Log viewing.',
    commands: [
      R('log_tail', 'log', 'log -t', 'Display logs to the end'),
      R('log_call', 'log', 'log -c', 'Call log'),
      R('log_filter', 'log', 'log -f', 'IP filter log'),
      R('log_wan', 'log', 'log -w', 'WAN log'),
      R('log_ppp', 'log', 'log -p', 'PPP/MP log'),
    ],
  },
  {
    family: 'fs',
    desc: 'Router file system.',
    commands: [
      R('fs_ls', 'fs', 'fs ls', 'List router file system'),
      R('fs_info', 'fs', 'fs info', 'File system info'),
      R('fs_pwd', 'fs', 'fs pwd', 'Print working directory'),
    ],
  },
  {
    family: 'object',
    desc: 'Objects (IP/service/keyword groups).',
    commands: [
      R('object_ip_view', 'object', 'object ip obj show', 'IP objects view'),
      R('object_service_view', 'object', 'object service obj show', 'Service objects view'),
    ],
  },
  {
    family: 'radius',
    desc: 'RADIUS AAA.',
    commands: [
      R('radius_show', 'radius', 'radius show', 'RADIUS configuration'),
      R('radius_show_local_cer', 'radius', 'radius show_local_cer', 'RADIUS local certificates'),
    ],
  },
  {
    family: 'local_8021x',
    desc: 'Local 802.1X.',
    commands: [
      R('local8021x_show', 'local_8021x', 'local_8021x show', 'Local 802.1X configuration'),
      R('local8021x_show_local_cer', 'local_8021x', 'local_8021x show_local_cer', 'Local 802.1X certificates'),
    ],
  },
  {
    family: 'user',
    desc: 'User management.',
    commands: [
      W('user_account', 'user', (a) => `user account ${String(a.param)}`, { param: safeText() }, 'Configure user account'),
      W('user_edit', 'user', (a) => `user edit ${String(a.param)}`, { param: safeText() }, 'Edit user profile'),
      W('user_set', 'user', (a) => `user set ${String(a.param)}`, { param: safeText() }, 'Set user management general setup'),
      W('user_setdefault', 'user', () => 'user setdefault', {}, 'Reset all user profiles to factory default'),
    ],
  },
  {
    family: 'upnp',
    desc: 'UPnP.',
    commands: [
      W('upnp_on', 'upnp', () => 'upnp on', {}, 'Enable UPnP', true),
      W('upnp_off', 'upnp', () => 'upnp off', {}, 'Disable UPnP', true),
      R('upnp_nat', 'upnp', 'upnp nat', 'UPnP NAT view'),
    ],
  },
  {
    family: 'wol',
    desc: 'Wake-on-LAN.',
    commands: [
      W('wol_send', 'wol', (a) => `wol ${a.mac}`, { mac: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/) }, 'Send Wake-on-LAN magic packet', false, { skipCommit: true }),
    ],
  },
  {
    family: 'appqos',
    desc: 'Application QoS.',
    commands: [
      R('appqos_view', 'appqos', 'appqos view', 'APP QoS profile view'),
      W('appqos_enable', 'appqos', (a) => `appqos enable ${String(a.mode)}`, { mode: oneZero }, 'Enable/disable APP QoS'),
    ],
  },
  {
    family: 'service',
    desc: 'MyVigor service.',
    commands: [
      R('service_show', 'service', 'service show', 'MyVigor service status'),
      R('service_get', 'service', 'service get', 'MyVigor service data'),
    ],
  },
  {
    family: 'csm',
    desc: 'Content security management.',
    commands: [
      R('csm_appe_show', 'csm', 'csm appe show', 'APP enforcement profile view'),
      W('csm_appe_set', 'csm', (a) => `csm appe set ${String(a.param)}`, { param: safeText() }, 'Set APP enforcement profile'),
      W('csm_ucf', 'csm', (a) => `csm ucf ${String(a.param)}`, { param: safeText() }, 'URL content filter settings'),
      W('csm_wcf', 'csm', (a) => `csm wcf ${String(a.param)}`, { param: safeText() }, 'Web content filter settings'),
      W('csm_dnsf', 'csm', (a) => `csm dnsf ${String(a.param)}`, { param: safeText() }, 'DNS filter settings'),
    ],
  },
  {
    family: 'msubnet',
    desc: 'Multi-subnet LAN.',
    commands: [
      R('msubnet_status', 'msubnet', 'msubnet status', 'Multi-subnet status'),
      W('msubnet_switch', 'msubnet', (a) => `msubnet switch ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable multi-subnet', true),
    ],
  },
  {
    family: 'testmail',
    desc: 'Mail alert test.',
    commands: [
      W('testmail_send', 'testmail', () => 'testmail', {}, 'Send a test mail', false, { skipCommit: true }),
    ],
  },
  {
    family: 'ip6',
    desc: 'IPv6 addressing and diagnostics.',
    commands: [
      Ra('ip6_ping', 'ip6', (a) => `ip6 ping ${String(a.host)}`, { host: z.string().ip({ version: 'v6' }) }, 'Ping an IPv6 host'),
      Ra('ip6_tracert', 'ip6', (a) => `ip6 tracert ${String(a.host)}`, { host: z.string().ip({ version: 'v6' }) }, 'Traceroute to an IPv6 host'),
      W('ip6_addr', 'ip6', (a) => `ip6 addr ${String(a.param)}`, { param: safeText() }, 'Configure an IPv6 address', true),
      W('ip6_mngt', 'ip6', (a) => `ip6 mngt ${String(a.proto)} ${a.onoff}`, {
        proto: z.enum(['http', 'https', 'telnet', 'ping', 'ssh']),
        onoff: onOff,
      }, 'Enable/disable IPv6 management for a protocol'),
    ],
  },
  {
    family: 'ldap',
    desc: 'LDAP AAA.',
    commands: [
      R('ldap_view', 'ldap', 'ldap view', 'LDAP configuration view'),
      W('ldap_set', 'ldap', (a) => `ldap set ${String(a.param)}`, { param: safeText() }, 'Configure LDAP'),
      W('ldap_user', 'ldap', (a) => `ldap user ${String(a.param)}`, { param: safeText() }, 'LDAP user operations'),
    ],
  },
  {
    family: 'tacacsplus',
    desc: 'TACACS+ AAA.',
    commands: [
      R('tacacsplus_view', 'tacacsplus', 'tacacsplus view', 'TACACS+ configuration view'),
      W('tacacsplus_set', 'tacacsplus', (a) => `tacacsplus set ${String(a.param)}`, { param: safeText() }, 'Configure TACACS+'),
    ],
  },
  {
    family: 'portmaptime',
    desc: 'Port mapping session timeouts.',
    commands: [
      R('portmaptime_list', 'portmaptime', 'portmaptime -l', 'List port mapping timeout settings'),
      W('portmaptime_set', 'portmaptime', (a) => `portmaptime -${a.proto} ${a.seconds}`, {
        proto: z.enum(['t', 'u', 'i', 'w', 's']),
        seconds: z.number().int().min(1).max(65535),
      }, 'Set port mapping session timeout (t=TCP, u=UDP, i=ICMP, w=WWW, s=SYN)'),
      W('portmaptime_flush', 'portmaptime', () => 'portmaptime -f', {}, 'Flush all portmaps (diagnostics)', true),
    ],
  },
  {
    family: 'swm',
    desc: 'Switch/AP management service.',
    commands: [
      R('swm_show', 'swm', 'swm show', 'Switch management status'),
      R('swm_get', 'swm', 'swm get', 'Switch management data'),
      W('swm_enable', 'swm', () => 'swm enable', {}, 'Enable switch management'),
      W('swm_disable', 'swm', () => 'swm disable', {}, 'Disable switch management'),
      W('swm_post', 'swm', (a) => `swm post ${String(a.param)}`, { param: safeText() }, 'Switch management POST'),
      W('swm_group', 'swm', (a) => `swm group ${String(a.param)}`, { param: safeText() }, 'Configure switch group'),
      W('swm_profile', 'swm', (a) => `swm profile ${String(a.param)}`, { param: safeText() }, 'Configure switch profile'),
      W('swm_detail', 'swm', (a) => `swm detail ${String(a.param)}`, { param: safeText() }, 'Switch detail operation'),
      W('swm_maintain', 'swm', (a) => `swm maintain ${String(a.param)}`, { param: safeText() }, 'Switch maintenance'),
      W('swm_search', 'swm', (a) => `swm search ${String(a.param)}`, { param: safeText() }, 'Switch search'),
      W('swm_db', 'swm', (a) => `swm db ${String(a.param)}`, { param: safeText() }, 'Switch database operation'),
      W('swm_alert', 'swm', (a) => `swm alert ${String(a.param)}`, { param: safeText() }, 'Switch alert configuration'),
      W('swm_log', 'swm', (a) => `swm log ${String(a.param)}`, { param: safeText() }, 'Switch log'),
      W('swm_snmp', 'swm', (a) => `swm snmp ${String(a.param)}`, { param: safeText() }, 'Switch SNMP'),
      W('swm_tr069', 'swm', (a) => `swm tr069 ${String(a.param)}`, { param: safeText() }, 'Switch TR-069'),
    ],
  },
];

export function allCommands(): CommandDef[] {
  return REGISTRY.flatMap((f) => f.commands);
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