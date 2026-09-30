import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  ipv4,
} from '../../validators.js';

export const srvFamily: FamilyDef = {
    family: 'srv',
    desc: 'DHCP and NAT services.',
    commands: [
      S('dhcp_status', 'srv', 'cli.srv.dhcp.status', 'DHCP server status + lease/reservation table', {
          args: {},
          toInput: () => ({}),
          partial: true,
        }),
      S('nat_view', 'srv', 'cli.srv.nat.view', 'NAT configuration view'),
      S('dhcp_on', 'srv', 'cli.srv.dhcp.on', 'Enable DHCP server (requires reboot to apply)'),
      S('dhcp_off', 'srv', 'cli.srv.dhcp.off', 'Disable DHCP server (requires reboot to apply)'),
      // Divergence D3 (SDK right / MCP wrong): the real `srv dhcp startip`
      // syntax takes only an IP address (no LAN selector, no pool count).
      // `lan`/`count` are kept in the tool's arg surface for D2 non-breaking
      // compatibility but are no longer sent to the router.
      S('dhcp_startip', 'srv', 'cli.srv.dhcp.startip', 'Set DHCP start IP and pool count', {
        args: {
          lan: z.number().int().min(1).max(8),
          start: ipv4,
          count: z.number().int().min(1).max(254),
        },
        toInput: (a) => ({ startIp: a.start as string }),
      }),
      // Divergence D3 (SDK right / MCP wrong): `srv dhcp gateway` takes only
      // the gateway IP, no LAN selector. `lan` kept for D2, no longer sent.
      S('dhcp_gateway', 'srv', 'cli.srv.dhcp.gateway', 'Set DHCP pool gateway', {
        args: {
          lan: z.number().int().min(1).max(8),
          gateway: ipv4,
        },
        toInput: (a) => ({ gatewayIp: a.gateway as string }),
      }),
      // Divergence D3 (SDK right / MCP wrong): the documented syntax is
      // `srv dhcp dns1 lan<n> <DNS IP>` (lowercase "lan" token, e.g. "lan8"),
      // not the previous "LAN<n>" (uppercase) rendering.
      S('dhcp_dns1', 'srv', 'cli.srv.dhcp.dns1', 'Set DHCP primary DNS', {
        args: {
          lan: z.number().int().min(1).max(8),
          dns: ipv4,
        },
        toInput: (a) => ({ lan: a.lan as number, dnsIp: a.dns as string }),
      }),
      S('dhcp_dns2', 'srv', 'cli.srv.dhcp.dns2', 'Set DHCP secondary DNS', {
        args: {
          lan: z.number().int().min(1).max(8),
          dns: ipv4,
        },
        toInput: (a) => ({ lan: a.lan as number, dnsIp: a.dns as string }),
      }),
      // Divergence D3 (SDK right / MCP wrong): `srv dhcp leasetime` takes
      // only the lease time in seconds, no LAN selector. `lan` kept for D2,
      // no longer sent.
      S('dhcp_leasetime', 'srv', 'cli.srv.dhcp.leasetime', 'Set DHCP lease time', {
        args: {
          lan: z.number().int().min(1).max(8),
          seconds: z.number().int().min(120).max(604800),
        },
        toInput: (a) => ({ leaseTimeSeconds: a.seconds as number }),
      }),
      // Left raw: divergence D3 (SDK right / MCP wrong) but cannot migrate
      // under D2 -- the real `srv nat dmz <wan 1|2> <index 1-300> [-i ip|-e
      // 0/1|-r]` syntax needs `wan`/`index` fields with no counterpart in
      // this tool's legacy `{lan, host}` args (`lan` 1-8 does not correspond
      // to `wan` 1|2, and there is no `index`). See report's divergence
      // ledger.
      S('nat_dmz', 'srv', 'cli.srv.nat.dmz', 'Configure DMZ mapping'),
    ],
  };
