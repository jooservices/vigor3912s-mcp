import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  onOff,
} from '../../validators.js';

export const msubnetFamily: FamilyDef = {
    family: 'msubnet',
    desc: 'Multi-subnet LAN.',
    commands: [
      R('msubnet_status', 'msubnet', 'msubnet status', 'Multi-subnet status'),
      W('msubnet_switch', 'msubnet', (a) => `msubnet switch ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable multi-subnet'),
    ],
  };
