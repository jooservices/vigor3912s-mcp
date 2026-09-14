import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const portmaptimeFamily: FamilyDef = {
    family: 'portmaptime',
    desc: 'Port mapping session timeouts.',
    commands: [
      R('portmaptime_list', 'portmaptime', 'portmaptime -l', 'List port mapping timeout settings'),
      W('portmaptime_set', 'portmaptime', (a) => `portmaptime -${a.proto} ${a.seconds}`, {
        proto: z.enum(['t', 'u', 'i', 'w', 's']),
        seconds: z.number().int().min(1).max(65535),
      }, 'Set port mapping session timeout (t=TCP, u=UDP, i=ICMP, w=WWW, s=SYN)'),
      W('portmaptime_flush', 'portmaptime', () => 'portmaptime -f', {}, 'Flush all portmaps (diagnostics)'),
    ],
  };
