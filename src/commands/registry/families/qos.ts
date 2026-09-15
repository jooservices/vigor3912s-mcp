import { z } from 'zod';
import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

const tokens = z.array(safeText()).min(1);

export const qosFamily: FamilyDef = {
  family: 'qos',
  desc: 'QoS configuration (write).',
  commands: [
    W(
      'qos_setup',
      'qos',
      (a) => `qos setup ${(a.args as string[]).join(' ')}`,
      { args: tokens },
      'Configure QoS (token args after qos setup)',
    ),
    W(
      'qos_class',
      'qos',
      (a) => `qos class ${(a.args as string[]).join(' ')}`,
      { args: tokens },
      'Configure QoS class (token args after qos class)',
    ),
  ],
};
