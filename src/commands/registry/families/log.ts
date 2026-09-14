import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const logFamily: FamilyDef = {
    family: 'log',
    desc: 'Log viewing.',
    commands: [
      R('log_tail', 'log', 'log -t', 'Display logs to the end'),
      R('log_call', 'log', 'log -c', 'Call log'),
      R('log_filter', 'log', 'log -f', 'IP filter log'),
      R('log_wan', 'log', 'log -w', 'WAN log'),
      R('log_ppp', 'log', 'log -p', 'PPP/MP log'),
    ],
  };
