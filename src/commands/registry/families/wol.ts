import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { macColon } from '../../validators.js';

// Divergence D3: bare `wol <mac>` doesn't exist — the documented syntax is
// `wol up <MAC Address>` (CLI reference:
// docs/05-3912s-reference/cli-reference-raw.txt:11771). SDK is correct;
// render now includes `up`.
export const wolFamily: FamilyDef = {
  family: 'wol',
  desc: 'Wake-on-LAN.',
  commands: [
    S('wol_send', 'wol', 'cli.wol', 'Send Wake-on-LAN magic packet', {
      args: { mac: macColon },
      toInput: (a) => ({ macAddress: a.mac }),
    }),
  ],
};
