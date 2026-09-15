import { z } from 'zod';
import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const nopingAction = z.enum(['on', 'off', 'viewlog', 'clearlog']);
const defensewormAction = z.enum(['on', 'off', 'viewlog', 'clearlog', 'add', 'del']);

export const mngtFamily: FamilyDef = {
  family: 'mngt',
  desc: 'Management/access control (write).',
  commands: [
    W(
      'mngt_sshport',
      'mngt',
      (a) => `mngt sshport ${a.port}`,
      { port: z.number().int().min(1).max(65535) },
      'Set SSH port',
    ),
    W(
      'mngt_telnetport',
      'mngt',
      (a) => `mngt telnetport ${a.port}`,
      { port: z.number().int().min(1).max(65535) },
      'Set telnet port',
    ),
    W(
      'mngt_httpport',
      'mngt',
      (a) => `mngt httpport ${a.port}`,
      { port: z.number().int().min(1).max(65535) },
      'Set HTTP port',
    ),
    W(
      'mngt_httpsport',
      'mngt',
      (a) => `mngt httpsport ${a.port}`,
      { port: z.number().int().min(1).max(65535) },
      'Set HTTPS port',
    ),
    W(
      'mngt_sshtimeout',
      'mngt',
      (a) => `mngt sshtimeout ${a.seconds}`,
      { seconds: z.number().int().min(60).max(300) },
      'Set SSH session timeout in seconds (60-300)',
    ),
    W(
      'mngt_telnettimeout',
      'mngt',
      (a) => `mngt telnettimeout ${a.seconds}`,
      { seconds: z.number().int().min(60).max(300) },
      'Set telnet session timeout in seconds (60-300)',
    ),
    W(
      'mngt_noping',
      'mngt',
      (a) => `mngt noping ${String(a.action)}`,
      { action: nopingAction },
      'Control LAN-to-WAN ping forward (on|off|viewlog|clearlog)',
    ),
    W(
      'mngt_defenseworm',
      'mngt',
      (a) => {
        if (a.action === 'add' || a.action === 'del') {
          if (a.port == null) {
            throw new Error('port is required when action is add or del');
          }
          return `mngt defenseworm ${String(a.action)} ${String(a.port)}`;
        }
        return `mngt defenseworm ${String(a.action)}`;
      },
      {
        action: defensewormAction,
        port: z.number().int().min(1).max(65535).optional(),
      },
      'Worm defense (on|off|viewlog|clearlog|add|del); add/del require port',
    ),
    W(
      'mngt_bfp',
      'mngt',
      (a) => `mngt bfp ${(a.args as string[]).join(' ')}`,
      {
        args: z
          .array(safeText())
          .min(1)
          .refine(
            (tokens) =>
              tokens.every((t) => !t.startsWith('-') || ['-e', '-s', '-l', '-p', '-v'].includes(t)),
            { message: 'mngt bfp flags must be one of -e -s -l -p -v' },
          ),
      },
      'Brute-force protection flags (e.g. args=["-e","1"])',
    ),
  ],
};
