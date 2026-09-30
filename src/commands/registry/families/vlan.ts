import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const vlanFamily: FamilyDef = {
  family: 'vlan',
  desc: 'VLAN configuration.',
  commands: [
    S('vlan_status', 'vlan', 'cli.vlan.status', 'VLAN status'),
    S('vlan_on', 'vlan', 'cli.vlan.on', 'Enable VLAN'),
    S('vlan_off', 'vlan', 'cli.vlan.off', 'Disable VLAN'),
    S(
      'vlan_group',
      'vlan',
      'cli.vlan.group',
      'VLAN group (vlan group <id> <add|set|show|…> [pN…])',
      {
        args: {
          groupId: z.number().int().min(0).max(99),
          action: z.enum(['add', 'add_ex', 'set', 'set_ex', 'show']),
          ports: z.array(z.number().int().min(1).max(12)).optional(),
        },
      },
    ),
  ],
};
