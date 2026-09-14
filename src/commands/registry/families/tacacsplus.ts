import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const tacacsplusFamily: FamilyDef = {
    family: 'tacacsplus',
    desc: 'TACACS+ AAA.',
    commands: [
      R('tacacsplus_view', 'tacacsplus', 'tacacsplus view', 'TACACS+ configuration view'),
      W('tacacsplus_set', 'tacacsplus', (a) => `tacacsplus set ${String(a.param)}`, { param: safeText() }, 'Configure TACACS+'),
    ],
  };
