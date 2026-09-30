import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const nopingAction = z.enum(['on', 'off', 'viewlog', 'clearlog']);
const defensewormAction = z.enum(['on', 'off', 'viewlog', 'clearlog', 'add', 'del']);

export const mngtFamily: FamilyDef = {
  family: 'mngt',
  desc: 'Management/access control (write).',
  commands: [
    S('mngt_sshport', 'mngt', 'cli.mngt.sshport', 'Set SSH port', {
      args: { port: z.number().int().min(1).max(65535) },
      toInput: (a) => ({ port: a.port as number }),
    }),
    S('mngt_telnetport', 'mngt', 'cli.mngt.telnetport', 'Set telnet port', {
      args: { port: z.number().int().min(1).max(65535) },
      toInput: (a) => ({ port: a.port as number }),
    }),
    S('mngt_httpport', 'mngt', 'cli.mngt.httpport', 'Set HTTP port', {
      args: { port: z.number().int().min(1).max(65535) },
      toInput: (a) => ({ port: a.port as number }),
    }),
    S('mngt_httpsport', 'mngt', 'cli.mngt.httpsport', 'Set HTTPS port', {
      args: { port: z.number().int().min(1).max(65535) },
      toInput: (a) => ({ port: a.port as number }),
    }),
    S('mngt_sshtimeout', 'mngt', 'cli.mngt.sshtimeout', 'Set SSH session timeout in seconds (60-300)', {
      args: { seconds: z.number().int().min(60).max(300) },
      toInput: (a) => ({ seconds: a.seconds as number }),
    }),
    S(
      'mngt_telnettimeout',
      'mngt',
      'cli.mngt.telnettimeout',
      'Set telnet session timeout in seconds (60-300)',
      {
        args: { seconds: z.number().int().min(60).max(300) },
        toInput: (a) => ({ seconds: a.seconds as number }),
      },
    ),
    S('mngt_noping', 'mngt', 'cli.mngt.noping', 'Control LAN-to-WAN ping forward (on|off|viewlog|clearlog)', {
      args: { action: nopingAction },
      toInput: (a) => ({ action: a.action as string }),
    }),
    S(
      'mngt_defenseworm',
      'mngt',
      'cli.mngt.defenseworm',
      'Worm defense (on|off|viewlog|clearlog|add|del); add/del require port',
      {
        args: {
          action: defensewormAction,
          port: z.number().int().min(1).max(65535).optional(),
        },
        toInput: (a) => {
          const action = a.action as string;
          if (action === 'add' || action === 'del') {
            if (a.port == null) throw new Error('port is required when action is add or del');
            return { action, port: a.port as number };
          }
          return { action };
        },
      },
    ),
    S(
      'mngt_bfp',
      'mngt',
      'cli.mngt.bfp',
      'Brute-force protection flags (e.g. args=["-e","1"])',
      {
        args: {
          args: z
            .array(safeText())
            .min(1)
            .refine(
              (tokens) =>
                tokens.every((t) => !t.startsWith('-') || ['-e', '-s', '-l', '-p', '-v'].includes(t)),
              { message: 'mngt bfp flags must be one of -e -s -l -p -v' },
            ),
        },
        toInput: (a) => ({ args: a.args as string[] }),
      },
    ),
  ],
};
