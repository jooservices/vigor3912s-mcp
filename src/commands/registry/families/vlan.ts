import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const vlanFamily: FamilyDef = {
  family: 'vlan',
  desc: 'VLAN configuration.',
  commands: [
    R('vlan_status', 'vlan', 'vlan status', 'VLAN status'),
    W('vlan_on', 'vlan', () => 'vlan on', {}, 'Enable VLAN'),
    W('vlan_off', 'vlan', () => 'vlan off', {}, 'Disable VLAN'),
    W(
      'vlan_group',
      'vlan',
      (a) => {
        const ports = (a.ports as number[] | undefined) ?? [];
        const portsSuffix = ports.length > 0 ? ` ${ports.map((p) => `p${p}`).join(' ')}` : '';
        if (a.action !== 'show' && ports.length === 0) {
          throw new Error('ports required unless action=show');
        }
        return `vlan group ${String(a.groupId)} ${String(a.action)}${portsSuffix}`;
      },
      {
        groupId: z.number().int().min(0).max(99),
        action: z.enum(['add', 'add_ex', 'set', 'set_ex', 'show']),
        ports: z.array(z.number().int().min(1).max(12)).optional(),
      },
      'VLAN group (vlan group <id> <add|set|show|…> [pN…])',
    ),
  ],
};
