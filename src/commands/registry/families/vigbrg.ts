import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { oneZero } from '../../validators.js';

export const vigbrgFamily: FamilyDef = {
  family: 'vigbrg',
  desc: 'Vigor bridge.',
  commands: [
    S('vigbrg_status', 'vigbrg', 'cli.vigbrg.status', 'Vigor bridge status'),
    S('vigbrg_wanstatus', 'vigbrg', 'cli.vigbrg.wanstatus', 'Vigor bridge WAN status'),
    S('vigbrg_wlanstatus', 'vigbrg', 'cli.vigbrg.wlanstatus', 'Vigor bridge wireless status'),
    S(
      'vigbrg_set',
      'vigbrg',
      'cli.vigbrg.set',
      'Configure Vigor bridge (vigbrg set -v -w -l -e [-f])',
      {
        args: {
          ipVersion: z.union([z.literal(4), z.literal(6)]),
          wanIndex: z.number().int().min(1).max(10),
          lanIndex: z.number().int().min(1).max(100),
          bridgeEnabled: oneZero,
          firewallEnabled: oneZero.optional(),
        },
        toInput: (a) => ({
          ipVersion: a.ipVersion,
          wanIndex: a.wanIndex,
          lanIndex: a.lanIndex,
          bridgeEnabled: a.bridgeEnabled === 1,
          ...(a.firewallEnabled != null ? { firewallEnabled: a.firewallEnabled === 1 } : {}),
        }),
      },
    ),
  ],
};
