import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

export const vrrpFamily: FamilyDef = {
  family: 'vrrp',
  desc: 'VRRP.',
  commands: [
    R('vrrp_show', 'vrrp', 'vrrp show', 'VRRP configuration'),
    W(
      'vrrp_enable',
      'vrrp',
      (a) => `vrrp enable ${String(a.onOff)}`,
      { onOff: z.enum(['on', 'off']) },
      'Enable/disable VRRP (SDK cli.vrrp.enable)',
    ),
    W(
      'vrrp_set',
      'vrrp',
      (a) => `vrrp set ${String(a.param)}`,
      { param: safeText() },
      'Configure VRRP (SDK cli.vrrp.set; param is opaque trailing syntax)',
    ),
    W('vrrp_apply', 'vrrp', () => 'vrrp apply', {}, 'Apply VRRP configuration'),
    W('vrrp_reset', 'vrrp', () => 'vrrp reset', {}, 'Reset VRRP'),
  ],
};
