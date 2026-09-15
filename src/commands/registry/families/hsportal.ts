import { z } from 'zod';
import { R, W } from '../builders.js';
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
    R('hsportal_info', 'hsportal', 'hsportal info', 'Hotspot portal info'),
    R('hsportal_level', 'hsportal', 'hsportal level', 'Hotspot portal level'),
    W(
      'hsportal_setup',
      'hsportal',
      (a) => {
        const profile = req(a.profile as number | undefined, 'profile');
        const prefix = `hsportal setup -p ${profile}`;
        switch (a.action) {
          case 'reset':
            return `${prefix} -c`;
          case 'enable':
            return `${prefix} -e`;
          case 'disable':
            return `${prefix} -d`;
          case 'landingPageMode':
            return `${prefix} -r ${req(a.mode as number | undefined, 'mode')}`;
          case 'google':
            return `${prefix} -g ${req(a.enabled as boolean | undefined, 'enabled') ? '1' : '0'} -k ${req(a.appKey as string | undefined, 'appKey')}`;
          case 'facebook':
            return `${prefix} -f ${req(a.enabled as boolean | undefined, 'enabled') ? '1' : '0'} -i ${req(a.appId as string | undefined, 'appId')}`;
          default:
            throw new Error('invalid hsportal_setup action');
        }
      },
      {
        profile: z.number().int().min(1).max(4),
        action: z.enum(['reset', 'enable', 'disable', 'landingPageMode', 'google', 'facebook']),
        mode: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
        enabled: z.boolean().optional(),
        appKey: noControl().optional(),
        appId: noControl().optional(),
      },
      'Hotspot portal setup (SDK cli.hsportal.setup)',
    ),
  ],
};
