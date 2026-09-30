import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

export const vrrpFamily: FamilyDef = {
  family: 'vrrp',
  desc: 'VRRP.',
  commands: [
    S('vrrp_show', 'vrrp', 'cli.vrrp.show', 'VRRP configuration'),
    S('vrrp_enable', 'vrrp', 'cli.vrrp.enable', 'Enable/disable VRRP (SDK cli.vrrp.enable)', {
      args: { onOff: z.enum(['on', 'off']) },
    }),
    S(
      'vrrp_set',
      'vrrp',
      'cli.vrrp.set',
      'Configure VRRP (SDK cli.vrrp.set; param is opaque trailing syntax)',
      { args: { param: safeText() } },
    ),
    S('vrrp_apply', 'vrrp', 'cli.vrrp.apply', 'Apply VRRP configuration'),
    S('vrrp_reset', 'vrrp', 'cli.vrrp.reset', 'Reset VRRP'),
  ],
};
