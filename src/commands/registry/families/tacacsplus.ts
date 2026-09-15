import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const tokens = z.array(safeText()).min(1);

export const tacacsplusFamily: FamilyDef = {
  family: 'tacacsplus',
  desc: 'TACACS+ AAA.',
  commands: [
    R('tacacsplus_view', 'tacacsplus', 'tacacsplus view', 'TACACS+ configuration view'),
    W(
      'tacacsplus_set',
      'tacacsplus',
      (a) => `tacacsplus set ${(a.args as string[]).join(' ')}`,
      { args: tokens },
      'Configure TACACS+ (token args after tacacsplus set)',
    ),
  ],
};
