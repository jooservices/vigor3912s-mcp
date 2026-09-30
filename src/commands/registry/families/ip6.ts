import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  ipv6,
  onOff,
} from '../../validators.js';

export const ip6Family: FamilyDef = {
    family: 'ip6',
    desc: 'IPv6 addressing and diagnostics.',
    commands: [
      // partial: cli.ip6.ping also supports optional interfaceLabel/sendCount/dataSize this tool doesn't expose.
      S('ip6_ping', 'ip6', 'cli.ip6.ping', 'Ping an IPv6 host', {
          args: { host: ipv6 },
          toInput: (a) => ({ target: a.host as string }),
          partial: true,
        }),
      // partial: cli.ip6.tracert also supports an optional interfaceLabel this tool doesn't expose.
      S('ip6_tracert', 'ip6', 'cli.ip6.tracert', 'Traceroute to an IPv6 host', {
          args: { host: ipv6 },
          toInput: (a) => ({ target: a.host as string }),
          partial: true,
          timeoutMs: 60000,
        }),
      // The old token passthrough could emit undocumented forms. Expose the
      // SDK discriminated union so the operation validates every sub-form.
      S('ip6_addr', 'ip6', 'cli.ip6.addr', 'Configure IPv6 address'),
      // partial: cli.ip6.mngt also covers list/listAdd/listRemove/listFlush/status
      // actions and internet/enforce_https services this tool doesn't expose.
      S('ip6_mngt', 'ip6', 'cli.ip6.mngt', 'Enable/disable IPv6 management for a protocol', {
          args: {
            proto: z.enum(['http', 'https', 'telnet', 'ping', 'ssh']),
            onoff: onOff,
          },
          toInput: (a) => ({
            action: 'service',
            service: a.proto as string,
            enabled: a.onoff === 'on',
          }),
          partial: true,
        }),
    ],
  };
