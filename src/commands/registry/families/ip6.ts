import { z } from 'zod';
import { Ra, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  ipv6,
  onOff,
  safeText,
} from '../../validators.js';

export const ip6Family: FamilyDef = {
    family: 'ip6',
    desc: 'IPv6 addressing and diagnostics.',
    commands: [
      Ra('ip6_ping', 'ip6', (a) => `ip6 ping ${String(a.host)}`, { host: ipv6 }, 'Ping an IPv6 host'),
      Ra('ip6_tracert', 'ip6', (a) => `ip6 tracert ${String(a.host)}`, { host: ipv6 }, 'Traceroute to an IPv6 host'),
      W(
        'ip6_addr',
        'ip6',
        (a) => `ip6 addr ${(a.args as string[]).join(' ')}`,
        { args: z.array(safeText()).min(1) },
        'Configure IPv6 address (token args after ip6 addr)',
      ),
      W('ip6_mngt', 'ip6', (a) => `ip6 mngt ${String(a.proto)} ${a.onoff}`, {
        proto: z.enum(['http', 'https', 'telnet', 'ping', 'ssh']),
        onoff: onOff,
      }, 'Enable/disable IPv6 management for a protocol'),
    ],
  };
