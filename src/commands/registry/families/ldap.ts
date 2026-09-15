import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const tokens = z.array(safeText()).min(1);

export const ldapFamily: FamilyDef = {
  family: 'ldap',
  desc: 'LDAP AAA.',
  commands: [
    R('ldap_view', 'ldap', 'ldap view', 'LDAP configuration view'),
    W(
      'ldap_set',
      'ldap',
      (a) => `ldap set ${(a.args as string[]).join(' ')}`,
      { args: tokens },
      'Configure LDAP (token args after ldap set)',
    ),
    W(
      'ldap_user',
      'ldap',
      (a) => `ldap user ${(a.args as string[]).join(' ')}`,
      { args: tokens },
      'LDAP user ops (token args after ldap user)',
    ),
  ],
};
