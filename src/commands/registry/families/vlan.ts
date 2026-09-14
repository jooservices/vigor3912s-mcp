import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const vlanFamily: FamilyDef = {
    family: 'vlan',
    desc: 'VLAN configuration.',
    commands: [
      R('vlan_status', 'vlan', 'vlan status', 'VLAN status'),
      W('vlan_on', 'vlan', () => 'vlan on', {}, 'Enable VLAN'),
      W('vlan_off', 'vlan', () => 'vlan off', {}, 'Disable VLAN'),
      W('vlan_group', 'vlan', (a) => `vlan group ${String(a.param)}`, { param: safeText() }, 'Configure VLAN group'),
    ],
  };
