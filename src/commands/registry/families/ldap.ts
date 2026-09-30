import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { ipv4, noControl, safeText } from '../../validators.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

/**
 * `ldap_set`'s `ip`/`password` options previously rendered lowercase
 * `ldap set ip ...` / `ldap set password ...`. The SDK's `cli.ldap.set`
 * (documented syntax + worked example, CLI reference rawLines 4086-4104:
 * `> ldap set IP 192.168.100.155`, `> ldap set PWD 123456`) uses uppercase
 * `IP` / `PWD` tokens — SDK correct, MCP was wrong; migrating fixes the
 * rendered command to match the documented/verified device syntax.
 */
export const ldapFamily: FamilyDef = {
  family: 'ldap',
  desc: 'LDAP AAA.',
  commands: [
    S('ldap_view', 'ldap', 'cli.ldap.view', 'LDAP configuration view'),
    S(
      'ldap_set',
      'ldap',
      'cli.ldap.set',
      'LDAP set (SDK cli.ldap.set)',
      {
        args: {
          option: z.enum(['enable', 'type', 'ssl', 'ip', 'port', 'dn', 'password']),
          enabled: z.boolean().optional(),
          bindType: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
          ipAddress: ipv4.optional(),
          port: z.number().int().min(1).max(65535).optional(),
          value: noControl().optional(),
        },
        toInput: (a) => {
          switch (a.option) {
            case 'enable':
              return { option: 'enable', enabled: req(a.enabled as boolean | undefined, 'enabled') };
            case 'type':
              return { option: 'type', bindType: req(a.bindType as 0 | 1 | 2 | undefined, 'bindType') };
            case 'ssl':
              return { option: 'ssl', enabled: req(a.enabled as boolean | undefined, 'enabled') };
            case 'ip':
              return { option: 'ip', ipAddress: req(a.ipAddress as string | undefined, 'ipAddress') };
            case 'port':
              return { option: 'port', port: req(a.port as number | undefined, 'port') };
            case 'dn':
              return { option: 'dn', value: req(a.value as string | undefined, 'value') };
            case 'password':
              return { option: 'password', value: req(a.value as string | undefined, 'value') };
            default:
              throw new Error('invalid ldap_set option');
          }
        },
      },
    ),
    S(
      'ldap_user',
      'ldap',
      'cli.ldap.user',
      'LDAP user profile (SDK cli.ldap.user)',
      {
        args: {
          index: z.number().int().min(1).max(8),
          action: z.enum(['name', 'baseDn', 'filter', 'groupDn', 'commonName', 'view']),
          value: safeText().optional(),
        },
        toInput: (a) => {
          const index = req(a.index as number | undefined, 'index');
          switch (a.action) {
            case 'name':
              return { index, action: 'name', value: req(a.value as string | undefined, 'value') };
            case 'baseDn':
              return { index, action: 'baseDn', value: req(a.value as string | undefined, 'value') };
            case 'filter':
              return { index, action: 'filter', value: req(a.value as string | undefined, 'value') };
            case 'groupDn':
              return { index, action: 'groupDn', value: req(a.value as string | undefined, 'value') };
            case 'commonName':
              return { index, action: 'commonName', value: req(a.value as string | undefined, 'value') };
            case 'view':
              return { index, action: 'view' };
            default:
              throw new Error('invalid ldap_user action');
          }
        },
      },
    ),
  ],
};
