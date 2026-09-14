import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const ldapFamily: FamilyDef = {
    family: 'ldap',
    desc: 'LDAP AAA.',
    commands: [
      R('ldap_view', 'ldap', 'ldap view', 'LDAP configuration view'),
      W('ldap_set', 'ldap', (a) => `ldap set ${String(a.param)}`, { param: safeText() }, 'Configure LDAP'),
      W('ldap_user', 'ldap', (a) => `ldap user ${String(a.param)}`, { param: safeText() }, 'LDAP user operations'),
    ],
  };
