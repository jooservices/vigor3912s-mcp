import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const vigbrgFamily: FamilyDef = {
    family: 'vigbrg',
    desc: 'Vigor bridge.',
    commands: [
      R('vigbrg_status', 'vigbrg', 'vigbrg status', 'Vigor bridge status'),
      R('vigbrg_wanstatus', 'vigbrg', 'vigbrg wanstatus', 'Vigor bridge WAN status'),
      R('vigbrg_wlanstatus', 'vigbrg', 'vigbrg wlanstatus', 'Vigor bridge wireless status'),
      W('vigbrg_set', 'vigbrg', (a) => `vigbrg set ${String(a.param)}`, { param: safeText() }, 'Configure Vigor bridge'),
    ],
  };
