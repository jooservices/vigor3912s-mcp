import { R, S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const local_8021xFamily: FamilyDef = {
  family: 'local_8021x',
  desc: 'Local 802.1X.',
  commands: [
    S('local8021x_show', 'local_8021x', 'cli.local8021x', 'Local 802.1X configuration'),
    // No SDK op: the `local_8021x` heading is modelled by the SDK as a single
    // read-classified entry (`cli.local8021x`) covering only the documented
    // `local_8021x show` sub-form; `show_local_cer` isn't a sub-form listed
    // in the CLI reference (docs/05-3912s-reference/cli-reference-raw.txt
    // ~11727-11762) or in ../vigor3912s-sdk/src/domains/local_8021x.ts. Left
    // raw — inconclusive whether this command ever existed on this firmware.
    R(
      'local8021x_show_local_cer',
      'local_8021x',
      'local_8021x show_local_cer',
      'Local 802.1X certificates',
    ),
  ],
};
