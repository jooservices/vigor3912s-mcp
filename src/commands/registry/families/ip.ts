import { z } from 'zod';
import { R, Ra, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  parseArpStatus,
  parsePing,
  parseRouteStatus,
} from '../../../tools/parsers.js';
import {
  ipv4,
  ipv4Mask,
  macDash,
} from '../../validators.js';

export const ipFamily: FamilyDef = {
    family: 'ip',
    desc: 'IP, routing, ARP, diagnostics.',
    commands: [
      R('ip_route_status', 'ip', 'ip route status', 'Routing table (connected/static/default)', parseRouteStatus),
      R('ip_arp_status', 'ip', 'ip arp status', 'ARP table', parseArpStatus),
      Ra(
        'ip_ping',
        'ip',
        (a) => `ip ping ${String(a.host)}`,
        { host: ipv4 },
        'Ping an IPv4 host (5 packets)',
        (raw, a) => parsePing(raw, String(a.host ?? '')),
      ),
      Ra('ip_tracert', 'ip', (a) => `ip tracert ${String(a.host)}`, { host: ipv4 }, 'Traceroute to an IPv4 host'),
      R('ip_session', 'ip', 'ip session', 'IP session table'),
      R('ip_dnsforward', 'ip', 'ip dnsforward', 'DNS forward table'),
      R('ip_lanDNSRes', 'ip', 'ip lanDNSRes', 'LAN DNS resolution cache'),
      W('ip_addr', 'ip', (a) => `ip addr LAN${a.lan} ${a.ip}`, { lan: z.number().int().min(1).max(8), ip: ipv4 }, 'Set LAN IP'),
      W('ip_nmask', 'ip', (a) => `ip nmask LAN${a.lan} ${a.mask}`, {
        lan: z.number().int().min(1).max(8),
        mask: ipv4Mask,
      }, 'Set LAN netmask'),
      W('ip_route_add', 'ip', (a) => `ip route add ${a.dest} ${a.mask} ${a.gw}`, {
        dest: ipv4,
        mask: ipv4Mask,
        gw: ipv4,
      }, 'Add a static route'),
      W('ip_route_del', 'ip', (a) => `ip route del ${a.dest} ${a.mask}`, {
        dest: ipv4,
        mask: ipv4Mask,
      }, 'Delete a static route'),
      W('ip_bindmac', 'ip', (a) => `ip bindmac ${a.ip} ${a.mac}`, {
        ip: ipv4,
        mac: macDash,
      }, 'Bind IP to MAC address'),
    ],
  };
