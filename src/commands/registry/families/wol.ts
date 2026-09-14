import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  macColon,
} from '../../validators.js';

export const wolFamily: FamilyDef = {
    family: 'wol',
    desc: 'Wake-on-LAN.',
    commands: [
      W('wol_send', 'wol', (a) => `wol ${a.mac}`, { mac: macColon }, 'Send Wake-on-LAN magic packet'),
    ],
  };
