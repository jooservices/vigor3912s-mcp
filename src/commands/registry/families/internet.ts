import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl, safeText, wanIdx } from '../../validators.js';

export const internetFamily: FamilyDef = {
  family: 'internet',
  desc: 'Internet access profile (WAN setup).',
  commands: [
    R('internet_view', 'internet', 'internet -V', 'View Internet access profile'),
    W(
      'internet_set',
      'internet',
      (a) => {
        let cmd = `internet -W ${a.wan} -M ${a.mode}`;
        if (a.ispName) cmd += ` -S ${String(a.ispName)}`;
        if (a.username) cmd += ` -u ${String(a.username)}`;
        if (a.password) cmd += ` -p ${String(a.password)}`;
        return cmd;
      },
      {
        wan: wanIdx,
        mode: z.number().int().min(0).max(7),
        ispName: safeText(23).optional(),
        username: noControl(49).optional(),
        password: noControl(49).optional(),
      },
      'Set WAN internet access (mode required; optional ISP display name -S, user, password)',
    ),
  ],
};
