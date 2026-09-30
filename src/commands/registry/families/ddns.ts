import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  onOff,
} from '../../validators.js';

export const ddnsFamily: FamilyDef = {
    family: 'ddns',
    desc: 'Dynamic DNS.',
    commands: [
      S('ddns_show', 'ddns', 'cli.ddns.show', 'DDNS configuration'),
      S('ddns_log', 'ddns', 'cli.ddns.log', 'DDNS log'),
      // Divergence D3 (SDK right / MCP wrong): the documented `ddns enable
      // [0/1]` syntax takes a numeric flag, not the previous "on"/"off"
      // text. Tool args unchanged (D2); `toInput` now maps to a boolean.
      S('ddns_enable', 'ddns', 'cli.ddns.enable', 'Enable/disable DDNS', {
        args: { onoff: onOff },
        toInput: (a) => ({ enabled: a.onoff === 'on' }),
      }),
      S('ddns_forceupdate', 'ddns', 'cli.ddns.forceupdate', 'Force DDNS update'),
    ],
  };
