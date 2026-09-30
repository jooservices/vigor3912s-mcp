import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const haSetFlags = ['-e', '-l', '-M', '-v', '-R', '-p', '-k', '-u', '-m', '-s', '-y', '-c', '-C', '-I', '-h', '-d', '-o'] as const;

export const haFamily: FamilyDef = {
  family: 'ha',
  desc: 'High availability.',
  commands: [
    S(
      'ha_show',
      'ha',
      'cli.ha.show',
      'HA configuration (section: configSync=-c, generalSetup=-g)',
      { args: { section: z.enum(['configSync', 'generalSetup']) } },
    ),
    S(
      'ha_status',
      'ha',
      'cli.ha.status',
      'HA status (-a all routers / -m local; detailLevel 0|1|2)',
      {
        args: {
          scope: z.enum(['allRouters', 'localRouter']),
          detailLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        },
      },
    ),
    S('ha_set', 'ha', 'cli.ha.set', 'Configure HA (flag args, e.g. ["-e","1"])', {
      args: {
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
    }),
  ],
};
