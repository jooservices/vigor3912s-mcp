import { z } from 'zod';
import { R, W } from '../builders.js';
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
    R('tacacsplus_view', 'tacacsplus', 'tacacsplus view', 'TACACS+ configuration view'),
    W(
      'tacacsplus_set',
      'tacacsplus',
      (a) => {
        switch (a.action) {
          case 'enable':
            return `tacacsplus set -e ${req(a.enabled as boolean | undefined, 'enabled') ? '1' : '0'}`;
          case 'serverIp': {
            const idx = req(a.serverIndex as number | undefined, 'serverIndex');
            const ip = req(a.ipAddress as string | undefined, 'ipAddress');
            return `tacacsplus set -i "${idx} ${ip}"`;
          }
          case 'serverPort': {
            const idx = req(a.serverIndex as number | undefined, 'serverIndex');
            const port = req(a.port as number | undefined, 'port');
            return `tacacsplus set -p "${idx} ${port}"`;
          }
          case 'sharedSecret': {
            const idx = req(a.serverIndex as number | undefined, 'serverIndex');
            const secret = req(a.secret as string | undefined, 'secret');
            return `tacacsplus set -s "${idx} ${secret}"`;
          }
          case 'clear':
            return 'tacacsplus set -C yes';
          default:
            throw new Error('invalid tacacsplus_set action');
        }
      },
      {
        action: z.enum(['enable', 'serverIp', 'serverPort', 'sharedSecret', 'clear']),
        enabled: z.boolean().optional(),
        serverIndex: z.union([z.literal(0), z.literal(1)]).optional(),
        ipAddress: ipv4.optional(),
        port: z.number().int().min(1).max(65535).optional(),
        secret: noControl().refine((v) => !/"/.test(v), { message: 'quotes not allowed' }).optional(),
      },
      'TACACS+ set (SDK cli.tacacsplus.set)',
    ),
  ],
};
