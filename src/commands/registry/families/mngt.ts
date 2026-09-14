import { z } from 'zod';
import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  onOff,
} from '../../validators.js';

export const mngtFamily: FamilyDef = {
    family: 'mngt',
    desc: 'Management/access control (write).',
    commands: [
      W('mngt_sshport', 'mngt', (a) => `mngt sshport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set SSH port'),
      W('mngt_telnetport', 'mngt', (a) => `mngt telnetport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set telnet port'),
      W('mngt_httpport', 'mngt', (a) => `mngt httpport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set HTTP port'),
      W('mngt_httpsport', 'mngt', (a) => `mngt httpsport ${a.port}`, { port: z.number().int().min(1).max(65535) }, 'Set HTTPS port'),
      W('mngt_sshtimeout', 'mngt', (a) => `mngt sshtimeout ${a.minutes}`, { minutes: z.number().int().min(1).max(65535) }, 'Set SSH session timeout'),
      W('mngt_telnettimeout', 'mngt', (a) => `mngt telnettimeout ${a.minutes}`, { minutes: z.number().int().min(1).max(65535) }, 'Set telnet session timeout'),
      W('mngt_noping', 'mngt', (a) => `mngt noping ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable ping response'),
      W('mngt_defenseworm', 'mngt', (a) => `mngt defenseworm ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable worm defense'),
      W('mngt_bfp', 'mngt', (a) => `mngt bfp ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable brute-force protection'),
    ],
  };
