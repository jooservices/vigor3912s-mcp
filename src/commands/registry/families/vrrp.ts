import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  onOff,
  safeText,
} from '../../validators.js';

export const vrrpFamily: FamilyDef = {
    family: 'vrrp',
    desc: 'VRRP.',
    commands: [
      R('vrrp_show', 'vrrp', 'vrrp show', 'VRRP configuration'),
      W('vrrp_enable', 'vrrp', (a) => `vrrp enable ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable VRRP'),
      W('vrrp_set', 'vrrp', (a) => `vrrp set ${String(a.param)}`, { param: safeText() }, 'Configure VRRP'),
      W('vrrp_apply', 'vrrp', () => 'vrrp apply', {}, 'Apply VRRP configuration'),
      W('vrrp_reset', 'vrrp', () => 'vrrp reset', {}, 'Reset VRRP'),
    ],
  };
