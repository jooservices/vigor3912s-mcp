import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

const PROTO_TO_FIELD = {
  t: 'tcpTimeoutSeconds',
  u: 'udpTimeoutSeconds',
  i: 'igmpTimeoutSeconds',
  w: 'tcpWwwTimeoutSeconds',
  s: 'tcpSynTimeoutSeconds',
} as const;

export const portmaptimeFamily: FamilyDef = {
    family: 'portmaptime',
    desc: 'Port mapping session timeouts.',
    commands: [
      S('portmaptime_list', 'portmaptime', 'cli.portmaptime.l', 'List port mapping timeout settings'),
      // partial: cli.portmaptime accepts any combination of the 5 timeout flags
      // at once; this tool only ever sets one flag per call.
      S('portmaptime_set', 'portmaptime', 'cli.portmaptime', 'Set port mapping session timeout (t=TCP, u=UDP, i=ICMP, w=WWW, s=SYN)', {
          args: {
            proto: z.enum(['t', 'u', 'i', 'w', 's']),
            seconds: z.number().int().min(1).max(65535),
          },
          toInput: (a) => ({
            [PROTO_TO_FIELD[a.proto as keyof typeof PROTO_TO_FIELD]]: a.seconds,
          }),
          partial: true,
        }),
      S('portmaptime_flush', 'portmaptime', 'cli.portmaptime.f', 'Flush all portmaps (diagnostics)'),
    ],
  };
