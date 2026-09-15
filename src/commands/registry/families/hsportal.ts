import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const tokens = z.array(safeText()).min(1);

export const hsportalFamily: FamilyDef = {
  family: 'hsportal',
  desc: 'Hotspot portal.',
  commands: [
    R('hsportal_info', 'hsportal', 'hsportal info', 'Hotspot portal info'),
    R('hsportal_level', 'hsportal', 'hsportal level', 'Hotspot portal level'),
    W(
      'hsportal_setup',
      'hsportal',
      (a) => `hsportal setup ${(a.args as string[]).join(' ')}`,
      { args: tokens },
      'Hotspot portal setup (token args after hsportal setup)',
    ),
  ],
};
