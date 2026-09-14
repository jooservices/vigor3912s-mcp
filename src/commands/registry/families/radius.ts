import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const radiusFamily: FamilyDef = {
    family: 'radius',
    desc: 'RADIUS AAA.',
    commands: [
      R('radius_show', 'radius', 'radius show', 'RADIUS configuration'),
      R('radius_show_local_cer', 'radius', 'radius show_local_cer', 'RADIUS local certificates'),
    ],
  };
