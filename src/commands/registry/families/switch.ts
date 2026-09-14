import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const switchFamily: FamilyDef = {
    family: 'switch',
    desc: 'Switch management.',
    commands: [
      R('switch_status', 'switch', 'switch status', 'Switch status'),
      R('switch_list', 'switch', 'switch list', 'Switch port list'),
      R('switch_query', 'switch', 'switch query', 'Switch query'),
      W('switch_on', 'switch', (a) => `switch on ${String(a.param)}`, { param: safeText() }, 'Enable switch feature'),
      W('switch_off', 'switch', (a) => `switch off ${String(a.param)}`, { param: safeText() }, 'Disable switch feature'),
    ],
  };
