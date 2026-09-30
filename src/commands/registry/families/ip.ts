import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  ipv4,
  ipv4Mask,
} from '../../validators.js';

export const ipFamily: FamilyDef = {
    family: 'ip',
    desc: 'IP, routing, ARP, diagnostics.',
    commands: [
      S('ip_route_status', 'ip', 'cli.ip.route', 'Routing table (connected/static/default)'),
      S('ip_arp_status', 'ip', 'cli.ip.arp', 'ARP table', {
          args: {},
          toInput: () => ({ action: 'status' }),
          partial: true,
        }),
      S('ip_ping', 'ip', 'cli.ip.ping', 'Ping an IPv4 host (5 packets)', {
          args: { host: ipv4 },
          toInput: (a) => ({ targetIp: a.host as string }),
          partial: true,
        }),
      S('ip_tracert', 'ip', 'cli.ip.tracert', 'Traceroute to an IPv4 host', {
          args: { host: ipv4 },
          toInput: (a) => ({ targetIp: a.host as string }),
          partial: true,
          timeoutMs: 60000,
        }),
      S('ip_session', 'ip', 'cli.ip.session', 'IP session table'),
      S('ip_dnsforward', 'ip', 'cli.ip.dnsforward', 'DNS forward table'),
      S('ip_lanDNSRes', 'ip', 'cli.ip.landnsres', 'LAN DNS resolution cache'),
      // Divergence D3 (SDK right / MCP wrong): the documented `ip addr <IP
      // address>` syntax has no LAN selector. `lan` kept for D2, no longer
      // sent (known divergence noted in the task spec).
      S('ip_addr', 'ip', 'cli.ip.addr', 'Set LAN IP', {
        args: { lan: z.number().int().min(1).max(8), ip: ipv4 },
        toInput: (a) => ({ ipv4Address: a.ip as string }),
      }),
      // Divergence D3 (SDK right / MCP wrong): `ip nmask <IP netmask>` has
      // no LAN selector. `lan` kept for D2, no longer sent.
      S('ip_nmask', 'ip', 'cli.ip.nmask', 'Set LAN netmask', {
        args: {
          lan: z.number().int().min(1).max(8),
          mask: ipv4Mask,
        },
        toInput: (a) => ({ netmask: a.mask as string }),
      }),
      // Left raw: no SDK op. `cli.ip.route` only models `ip route status`
      // (`../vigor3912s-sdk/src/domains/ip.ts:534-555`); `add`/`del` are a
      // documented, deliberate YAGNI deferral there.
      S('ip_route_add', 'ip', 'cli.ip.route.add', 'Add a static route'),
      S('ip_route_del', 'ip', 'cli.ip.route.del', 'Delete a static route'),
      // Left raw: divergence D3 (SDK right / MCP wrong) but cannot migrate
      // under D2 -- the real `ip bindmac add <IP> <MAC> <Comment>` syntax
      // (colon-separated MAC) needs a required `comment` field with no
      // counterpart in this tool's legacy `{ip, mac}` args (dash-separated
      // MAC), and this tool's render is missing the `add` keyword entirely.
      // See report's divergence ledger.
      S('ip_bindmac', 'ip', 'cli.ip.bindmac', 'Bind IP to MAC address'),
    ],
  };
