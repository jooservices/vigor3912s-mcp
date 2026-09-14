import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const swmFamily: FamilyDef = {
    family: 'swm',
    desc: 'Switch/AP management service.',
    commands: [
      R('swm_show', 'swm', 'swm show', 'Switch management status'),
      R('swm_get', 'swm', 'swm get', 'Switch management data'),
      W('swm_enable', 'swm', () => 'swm enable', {}, 'Enable switch management'),
      W('swm_disable', 'swm', () => 'swm disable', {}, 'Disable switch management'),
      W('swm_post', 'swm', (a) => `swm post ${String(a.param)}`, { param: safeText() }, 'Switch management POST'),
      W('swm_group', 'swm', (a) => `swm group ${String(a.param)}`, { param: safeText() }, 'Configure switch group'),
      W('swm_profile', 'swm', (a) => `swm profile ${String(a.param)}`, { param: safeText() }, 'Configure switch profile'),
      W('swm_detail', 'swm', (a) => `swm detail ${String(a.param)}`, { param: safeText() }, 'Switch detail operation'),
      W('swm_maintain', 'swm', (a) => `swm maintain ${String(a.param)}`, { param: safeText() }, 'Switch maintenance'),
      W('swm_search', 'swm', (a) => `swm search ${String(a.param)}`, { param: safeText() }, 'Switch search'),
      W('swm_db', 'swm', (a) => `swm db ${String(a.param)}`, { param: safeText() }, 'Switch database operation'),
      W('swm_alert', 'swm', (a) => `swm alert ${String(a.param)}`, { param: safeText() }, 'Switch alert configuration'),
      W('swm_log', 'swm', (a) => `swm log ${String(a.param)}`, { param: safeText() }, 'Switch log'),
      W('swm_snmp', 'swm', (a) => `swm snmp ${String(a.param)}`, { param: safeText() }, 'Switch SNMP'),
      W('swm_tr069', 'swm', (a) => `swm tr069 ${String(a.param)}`, { param: safeText() }, 'Switch TR-069'),
    ],
  };
