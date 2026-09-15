import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { ipv4, noControl, safeText } from '../../validators.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

export const ldapFamily: FamilyDef = {
  family: 'ldap',
  desc: 'LDAP AAA.',
  commands: [
    R('ldap_view', 'ldap', 'ldap view', 'LDAP configuration view'),
    W(
      'ldap_set',
      'ldap',
      (a) => {
        switch (a.option) {
          case 'enable':
            return `ldap set enable ${req(a.enabled as boolean | undefined, 'enabled') ? '1' : '0'}`;
          case 'type':
            return `ldap set type ${req(a.bindType as number | undefined, 'bindType')}`;
          case 'ssl':
            return `ldap set ssl ${req(a.enabled as boolean | undefined, 'enabled') ? '1' : '0'}`;
          case 'ip':
            return `ldap set ip ${req(a.ipAddress as string | undefined, 'ipAddress')}`;
          case 'port':
            return `ldap set port ${req(a.port as number | undefined, 'port')}`;
          case 'dn':
            return `ldap set dn ${req(a.value as string | undefined, 'value')}`;
          case 'password':
            return `ldap set password ${req(a.value as string | undefined, 'value')}`;
          default:
            throw new Error('invalid ldap_set option');
        }
      },
      {
        option: z.enum(['enable', 'type', 'ssl', 'ip', 'port', 'dn', 'password']),
        enabled: z.boolean().optional(),
        bindType: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
        ipAddress: ipv4.optional(),
        port: z.number().int().min(1).max(65535).optional(),
        value: noControl().optional(),
      },
      'LDAP set (SDK cli.ldap.set)',
    ),
    W(
      'ldap_user',
      'ldap',
      (a) => {
        const prefix = `ldap user ${req(a.index as number | undefined, 'index')}`;
        switch (a.action) {
          case 'name':
            return `${prefix} -n ${req(a.value as string | undefined, 'value')}`;
          case 'baseDn':
            return `${prefix} -b ${req(a.value as string | undefined, 'value')}`;
          case 'filter':
            return `${prefix} -a ${req(a.value as string | undefined, 'value')}`;
          case 'groupDn':
            return `${prefix} -g ${req(a.value as string | undefined, 'value')}`;
          case 'commonName':
            return `${prefix} -c ${req(a.value as string | undefined, 'value')}`;
          case 'view':
            return `${prefix} -v`;
          default:
            throw new Error('invalid ldap_user action');
        }
      },
      {
        index: z.number().int().min(1).max(8),
        action: z.enum(['name', 'baseDn', 'filter', 'groupDn', 'commonName', 'view']),
        value: safeText().optional(),
      },
      'LDAP user profile (SDK cli.ldap.user)',
    ),
  ],
};
