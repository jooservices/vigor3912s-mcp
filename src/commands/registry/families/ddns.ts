import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  onOff,
} from '../../validators.js';

export const ddnsFamily: FamilyDef = {
    family: 'ddns',
    desc: 'Dynamic DNS.',
    commands: [
      R('ddns_show', 'ddns', 'ddns show', 'DDNS configuration'),
      R('ddns_log', 'ddns', 'ddns log', 'DDNS log'),
      W('ddns_enable', 'ddns', (a) => `ddns enable ${String(a.onoff)}`, { onoff: onOff }, 'Enable/disable DDNS'),
      W('ddns_forceupdate', 'ddns', () => 'ddns forceupdate', {}, 'Force DDNS update'),
    ],
  };
