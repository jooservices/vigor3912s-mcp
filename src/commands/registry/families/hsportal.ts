import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl } from '../../validators.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

export const hsportalFamily: FamilyDef = {
  family: 'hsportal',
  desc: 'Hotspot portal.',
  commands: [
    S('hsportal_info', 'hsportal', 'cli.hsportal.info', 'Hotspot portal info'),
    S('hsportal_level', 'hsportal', 'cli.hsportal.level', 'Hotspot portal level'),
    S(
      'hsportal_setup',
      'hsportal',
      'cli.hsportal.setup',
      'Hotspot portal setup (SDK cli.hsportal.setup)',
      {
        args: {
          profile: z.number().int().min(1).max(4),
          action: z.enum(['reset', 'enable', 'disable', 'landingPageMode', 'google', 'facebook']),
          mode: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
          enabled: z.boolean().optional(),
          appKey: noControl().optional(),
          appId: noControl().optional(),
        },
        toInput: (a) => {
          const profile = req(a.profile as number | undefined, 'profile');
          switch (a.action) {
            case 'reset':
              return { profile, action: 'reset' };
            case 'enable':
              return { profile, action: 'enable' };
            case 'disable':
              return { profile, action: 'disable' };
            case 'landingPageMode':
              return {
                profile,
                action: 'landingPageMode',
                mode: req(a.mode as 0 | 1 | 2 | undefined, 'mode'),
              };
            case 'google':
              return {
                profile,
                action: 'google',
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
                appKey: req(a.appKey as string | undefined, 'appKey'),
              };
            case 'facebook':
              return {
                profile,
                action: 'facebook',
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
                appId: req(a.appId as string | undefined, 'appId'),
              };
            default:
              throw new Error('invalid hsportal_setup action');
          }
        },
      },
    ),
  ],
};
