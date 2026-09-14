import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const portFamily: FamilyDef = {
    family: 'port',
    desc: 'Ethernet port settings.',
    commands: [
      R('port_status', 'port', 'port status', 'Ethernet port status'),
      R('port_sniff_status', 'port', 'port sniff status', 'Port sniffing status'),
      W('port_speed', 'port', (a) => `port ${a.port} ${a.speed}`, {
        port: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'all']),
        speed: z.enum(['AN', '100F', '100H', '10F', '10H']),
      }, 'Set ethernet port speed/duplex'),
    ],
  };
