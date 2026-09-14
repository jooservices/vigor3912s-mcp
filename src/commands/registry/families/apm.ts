import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const apmFamily: FamilyDef = {
    family: 'apm',
    desc: 'AP management.',
    commands: [
      R('apm_show', 'apm', 'apm show', 'AP management status'),
      R('apm_query', 'apm', 'apm query', 'AP query'),
      R('apm_stanum', 'apm', 'apm stanum', 'AP station number'),
      W('apm_enable', 'apm', () => 'apm enable', {}, 'Enable AP management'),
      W('apm_disable', 'apm', () => 'apm disable', {}, 'Disable AP management'),
    ],
  };
