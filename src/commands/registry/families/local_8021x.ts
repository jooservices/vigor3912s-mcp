import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const local_8021xFamily: FamilyDef = {
    family: 'local_8021x',
    desc: 'Local 802.1X.',
    commands: [
      R('local8021x_show', 'local_8021x', 'local_8021x show', 'Local 802.1X configuration'),
      R('local8021x_show_local_cer', 'local_8021x', 'local_8021x show_local_cer', 'Local 802.1X certificates'),
    ],
  };
