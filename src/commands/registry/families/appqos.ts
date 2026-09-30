import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { oneZero } from '../../validators.js';

export const appqosFamily: FamilyDef = {
  family: 'appqos',
  desc: 'Application QoS.',
  commands: [
    S('appqos_view', 'appqos', 'cli.appqos.view', 'APP QoS profile view'),
    S('appqos_enable', 'appqos', 'cli.appqos.enable', 'Enable/disable APP QoS', {
      args: { mode: oneZero },
      toInput: (a) => ({ enabled: a.mode === 1 }),
    }),
  ],
};
