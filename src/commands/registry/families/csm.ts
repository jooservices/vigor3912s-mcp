import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const csmFamily: FamilyDef = {
    family: 'csm',
    desc: 'Content security management.',
    commands: [
      R('csm_appe_show', 'csm', 'csm appe show', 'APP enforcement profile view'),
      W('csm_appe_set', 'csm', (a) => `csm appe set ${String(a.param)}`, { param: safeText() }, 'Set APP enforcement profile'),
      W('csm_ucf', 'csm', (a) => `csm ucf ${String(a.param)}`, { param: safeText() }, 'URL content filter settings'),
      W('csm_wcf', 'csm', (a) => `csm wcf ${String(a.param)}`, { param: safeText() }, 'Web content filter settings'),
      W('csm_dnsf', 'csm', (a) => `csm dnsf ${String(a.param)}`, { param: safeText() }, 'DNS filter settings'),
    ],
  };
