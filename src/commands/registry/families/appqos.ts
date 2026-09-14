import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  oneZero,
} from '../../validators.js';

export const appqosFamily: FamilyDef = {
    family: 'appqos',
    desc: 'Application QoS.',
    commands: [
      R('appqos_view', 'appqos', 'appqos view', 'APP QoS profile view'),
      W('appqos_enable', 'appqos', (a) => `appqos enable ${String(a.mode)}`, { mode: oneZero }, 'Enable/disable APP QoS'),
    ],
  };
