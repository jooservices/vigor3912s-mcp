import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const switchFamily: FamilyDef = {
  family: 'switch',
  desc: 'Switch management.',
  commands: [
    R('switch_status', 'switch', 'switch status', 'Switch status'),
    R('switch_list', 'switch', 'switch list', 'Switch port list'),
    R('switch_query', 'switch', 'switch query', 'Switch query'),
    W('switch_on', 'switch', () => 'switch on', {}, 'Enable switch (UG: switch on)'),
    W('switch_off', 'switch', () => 'switch off', {}, 'Disable switch (UG: switch off)'),
  ],
};
