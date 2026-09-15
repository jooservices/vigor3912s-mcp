import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { oneZero } from '../../validators.js';

export const vigbrgFamily: FamilyDef = {
  family: 'vigbrg',
  desc: 'Vigor bridge.',
  commands: [
    R('vigbrg_status', 'vigbrg', 'vigbrg status', 'Vigor bridge status'),
    R('vigbrg_wanstatus', 'vigbrg', 'vigbrg wanstatus', 'Vigor bridge WAN status'),
    R('vigbrg_wlanstatus', 'vigbrg', 'vigbrg wlanstatus', 'Vigor bridge wireless status'),
    W(
      'vigbrg_set',
      'vigbrg',
      (a) => {
        const parts = [
          'vigbrg set',
          '-v',
          String(a.ipVersion),
          '-w',
          String(a.wanIndex),
          '-l',
          String(a.lanIndex),
          '-e',
          String(a.bridgeEnabled),
        ];
        if (a.firewallEnabled != null) {
          parts.push('-f', String(a.firewallEnabled));
        }
        return parts.join(' ');
      },
      {
        ipVersion: z.union([z.literal(4), z.literal(6)]),
        wanIndex: z.number().int().min(1).max(10),
        lanIndex: z.number().int().min(1).max(100),
        bridgeEnabled: oneZero,
        firewallEnabled: oneZero.optional(),
      },
      'Configure Vigor bridge (vigbrg set -v -w -l -e [-f])',
    ),
  ],
};
