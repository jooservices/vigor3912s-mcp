import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  parseDhcpStatus,
} from '../../../tools/parsers.js';
import {
  ipv4,
} from '../../validators.js';

export const srvFamily: FamilyDef = {
    family: 'srv',
    desc: 'DHCP and NAT services.',
    commands: [
      R('dhcp_status', 'srv', 'srv dhcp status', 'DHCP server status + lease/reservation table', parseDhcpStatus),
      R('nat_view', 'srv', 'srv nat view', 'NAT configuration view'),
      W('dhcp_on', 'srv', () => 'srv dhcp on', {}, 'Enable DHCP server (requires reboot to apply)'),
      W('dhcp_off', 'srv', () => 'srv dhcp off', {}, 'Disable DHCP server (requires reboot to apply)'),
      W('dhcp_startip', 'srv', (a) => `srv dhcp startip LAN${a.lan} ${a.start} ${a.count}`, {
        lan: z.number().int().min(1).max(8),
        start: ipv4,
        count: z.number().int().min(1).max(254),
      }, 'Set DHCP start IP and pool count'),
      W('dhcp_gateway', 'srv', (a) => `srv dhcp gateway LAN${a.lan} ${a.gateway}`, {
        lan: z.number().int().min(1).max(8),
        gateway: ipv4,
      }, 'Set DHCP pool gateway'),
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
      }, 'Set DMZ host'),
    ],
  };
