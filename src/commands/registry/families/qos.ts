import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const qosFamily: FamilyDef = {
    family: 'qos',
    desc: 'QoS configuration (write).',
    commands: [
      W('qos_setup', 'qos', (a) => `qos setup ${String(a.param)}`, { param: safeText() }, 'Configure QoS'),
      W('qos_class', 'qos', (a) => `qos class ${String(a.param)}`, { param: safeText() }, 'Configure QoS class'),
    ],
  };
