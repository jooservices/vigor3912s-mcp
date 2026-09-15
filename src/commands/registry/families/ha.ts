import { z } from 'zod';
import { Ra, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const haSetFlags = ['-e', '-l', '-M', '-v', '-R', '-p', '-k', '-u', '-m', '-s', '-y', '-c', '-C', '-I', '-h', '-d', '-o'] as const;

export const haFamily: FamilyDef = {
  family: 'ha',
  desc: 'High availability.',
  commands: [
    Ra(
      'ha_show',
      'ha',
      (a) => `ha show ${a.section === 'configSync' ? '-c' : '-g'}`,
      { section: z.enum(['configSync', 'generalSetup']) },
      'HA configuration (section: configSync=-c, generalSetup=-g)',
    ),
    Ra(
      'ha_status',
      'ha',
      (a) => `ha status ${a.scope === 'allRouters' ? '-a' : '-m'} ${String(a.detailLevel)}`,
      {
        scope: z.enum(['allRouters', 'localRouter']),
        detailLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      },
      'HA status (-a all routers / -m local; detailLevel 0|1|2)',
    ),
    W(
      'ha_set',
      'ha',
      (a) => `ha set ${(a.args as string[]).join(' ')}`,
      {
        args: z
          .array(
            safeText().refine((token) => !/\s/.test(token), {
              message: 'ha set arguments must contain exactly one CLI token',
            }),
          )
          .min(1)
          .refine(
            (tokens) =>
              tokens.every((t) => !t.startsWith('-') || (haSetFlags as readonly string[]).includes(t)),
            { message: `ha set flags must be one of ${haSetFlags.join(' ')}` },
          ),
      },
      'Configure HA (flag args, e.g. ["-e","1"])',
    ),
  ],
};
