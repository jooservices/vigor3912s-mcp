import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
export const msubnetFamily: FamilyDef = {
    family: 'msubnet',
    desc: 'Multi-subnet LAN.',
    commands: [
      S('msubnet_status', 'msubnet', 'cli.msubnet.status', 'Multi-subnet status'),
      S('msubnet_switch', 'msubnet', 'cli.msubnet.switch', 'Enable/disable multi-subnet'),
    ],
  };
