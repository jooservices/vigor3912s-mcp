import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const hsportalFamily: FamilyDef = {
    family: 'hsportal',
    desc: 'Hotspot portal.',
    commands: [
      R('hsportal_info', 'hsportal', 'hsportal info', 'Hotspot portal info'),
      R('hsportal_level', 'hsportal', 'hsportal level', 'Hotspot portal level'),
      W('hsportal_setup', 'hsportal', (a) => `hsportal setup ${String(a.param)}`, { param: safeText() }, 'Configure hotspot portal'),
    ],
  };
