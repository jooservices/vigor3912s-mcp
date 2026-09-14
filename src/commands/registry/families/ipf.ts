import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const ipfFamily: FamilyDef = {
    family: 'ipf',
    desc: 'IP filter (firewall).',
    commands: [
      R('ipf_view', 'ipf', 'ipf view', 'IP filter rules view'),
      W('ipf_set', 'ipf', (a) => `ipf set ${String(a.param)}`, { param: safeText() }, 'Set IP filter option'),
      W('ipf_rule', 'ipf', (a) => `ipf rule ${String(a.param)}`, { param: safeText() }, 'Manage IP filter rules'),
    ],
  };
