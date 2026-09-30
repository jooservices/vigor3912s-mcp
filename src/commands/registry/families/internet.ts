import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl, safeText, wanIdx } from '../../validators.js';

export const internetFamily: FamilyDef = {
  family: 'internet',
  desc: 'Internet access profile (WAN setup).',
  commands: [
    S('internet_view', 'internet', 'cli.internet.v', 'View Internet access profile'),
    S(
        'internet_set',
        'internet',
        'cli.internet',
        'Set WAN internet access (mode required; optional ISP display name -S, user, password)',
        {
          args: {
            wan: wanIdx,
            mode: z.number().int().min(0).max(7),
            ispName: safeText(23).optional(),
            username: noControl(49).optional(),
            password: noControl(49).optional(),
          },
          toInput: (a) => ({
            wanInterface: a.wan,
            mode: a.mode,
            ...(a.ispName != null ? { ispName: a.ispName } : {}),
            ...(a.username != null ? { username: a.username } : {}),
            ...(a.password != null ? { password: a.password } : {}),
          }),
          partial: true,
        },
      ),
  ],
};
