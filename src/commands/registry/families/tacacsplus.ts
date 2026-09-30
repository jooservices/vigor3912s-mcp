import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { ipv4, noControl } from '../../validators.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

export const tacacsplusFamily: FamilyDef = {
  family: 'tacacsplus',
  desc: 'TACACS+ AAA.',
  commands: [
    S('tacacsplus_view', 'tacacsplus', 'cli.tacacsplus.view', 'TACACS+ configuration view'),
    S(
      'tacacsplus_set',
      'tacacsplus',
      'cli.tacacsplus.set',
      'TACACS+ set (SDK cli.tacacsplus.set)',
      {
        args: {
          action: z.enum(['enable', 'serverIp', 'serverPort', 'sharedSecret', 'clear']),
          enabled: z.boolean().optional(),
          serverIndex: z.union([z.literal(0), z.literal(1)]).optional(),
          ipAddress: ipv4.optional(),
          port: z.number().int().min(1).max(65535).optional(),
          secret: noControl().refine((v) => !/"/.test(v), { message: 'quotes not allowed' }).optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'enable':
              return { action: 'enable', enabled: req(a.enabled as boolean | undefined, 'enabled') };
            case 'serverIp':
              return {
                action: 'serverIp',
                serverIndex: req(a.serverIndex as 0 | 1 | undefined, 'serverIndex'),
                ipAddress: req(a.ipAddress as string | undefined, 'ipAddress'),
              };
            case 'serverPort':
              return {
                action: 'serverPort',
                serverIndex: req(a.serverIndex as 0 | 1 | undefined, 'serverIndex'),
                port: req(a.port as number | undefined, 'port'),
              };
            case 'sharedSecret':
              return {
                action: 'sharedSecret',
                serverIndex: req(a.serverIndex as 0 | 1 | undefined, 'serverIndex'),
                secret: req(a.secret as string | undefined, 'secret'),
              };
            case 'clear':
              return { action: 'clear' };
            default:
              throw new Error('invalid tacacsplus_set action');
          }
        },
      },
    ),
  ],
};
