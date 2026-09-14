import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const haFamily: FamilyDef = {
    family: 'ha',
    desc: 'High availability.',
    commands: [
      R('ha_show', 'ha', 'ha show', 'HA configuration'),
      R('ha_status', 'ha', 'ha status', 'HA status'),
      W('ha_set', 'ha', (a) => `ha set ${String(a.param)}`, { param: safeText() }, 'Configure HA'),
    ],
  };
