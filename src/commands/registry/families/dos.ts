import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const dosFamily: FamilyDef = {
    family: 'dos',
    desc: 'DoS defense.',
    commands: [
      R('dos_view', 'dos', 'dos -V', 'View DoS defense configuration'),
      R('dos_blacklist_show', 'dos', 'dos -B show', 'Show DoS blocking list'),
      R('dos_whitelist_show', 'dos', 'dos -P show', 'Show DoS passing (white) list'),
      W('dos_activate', 'dos', () => 'dos -A', {}, 'Activate DoS defense system'),
      W('dos_deactivate', 'dos', () => 'dos -D', {}, 'Deactivate DoS defense system'),
    ],
  };
