import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const portFamily: FamilyDef = {
    family: 'port',
    desc: 'Ethernet port settings.',
    commands: [
      S('port_status', 'port', 'cli.port.status', 'Ethernet port status'),
      S('port_sniff_status', 'port', 'cli.port.sniff.status', 'Port sniffing status'),
      S('port_speed', 'port', 'cli.port', 'Set ethernet port speed/duplex', {
          args: {
            port: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'all']),
            speed: z.enum(['AN', '100F', '100H', '10F', '10H']),
          },
          toInput: (a) => ({ kind: 'lan', port: a.port, speed: a.speed }),
          partial: true,
        }),
    ],
  };
