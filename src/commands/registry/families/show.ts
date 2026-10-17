import { R, S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const showFamily: FamilyDef = {
    family: 'show',
    desc: 'Status and diagnostics views (read-only).',
    commands: [
      R('show_status', 'show', 'show status', 'System uptime, LAN DNS, IP, per-WAN link status'),
      R('show_lan', 'show', 'show lan', 'LAN/VLAN interfaces: IP, mask, DHCP pool, gateway'),
      R('show_dmz', 'show', 'show dmz', 'DMZ host configuration'),
      R('show_dns', 'show', 'show dns', 'DNS server settings per LAN'),
      R('show_openport', 'show', 'show openport', 'Opened ports (NAT)'),
      R('show_nat', 'show', 'show nat', 'NAT port redirection running table'),
      R('show_portmap', 'show', 'show portmap', 'Port mapping table'),
      R('show_pmtime', 'show', 'show pmtime', 'Port mapping timeout settings'),
      R('show_session', 'show', 'show session', 'Session usage statistics'),
      S('show_traffic', 'show', 'cli.show.traffic.wan', 'Traffic statistics by WAN and direction'),
      S('show_clienttraffic', 'show', 'cli.show.clienttraffic.device', 'Per-client traffic statistics for a selected device and interface'),
      R('show_cpu', 'show', 'show cpu', 'CPU usage'),
      R('show_memory', 'show', 'show memory', 'Memory usage'),
      R('show_cocpu', 'show', 'show cocpu', 'Co-processor usage'),
      R('show_cputemp', 'show', 'show cputemp', 'CPU temperature'),
      R('show_statistic', 'show', 'show statistic', 'Interface statistics'),
      R('show_flow', 'show', 'show flow', 'Flow tracking view'),
      R('show_voip', 'show', 'show voip', 'VoIP status'),
      {
        ...R('show_qryrdsl', 'show', 'show qryrdsl', 'Unsupported bare DSL status query on firmware 4.4.7_RC2'),
        unsupported: {
          firmware: '4.4.7_RC2',
          evidence: 'The bare form returned a help listing; live help documents the explicit status subcommand.',
          message: 'Use show_qryrdsl_status for the supported read-only status query.',
        },
      },
      R('show_qryrdsl_status', 'show', 'show qryrdsl status', 'Remote DSL status (read-only)'),
    ],
  };
