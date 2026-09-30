import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

/** SDK keeps trailing VPN syntax as opaque `param` (canonical). */
export const vpnFamily: FamilyDef = {
  family: 'vpn',
  desc: 'VPN configuration (mostly write).',
  commands: [
    S('vpn_list', 'vpn', 'cli.vpn.list', 'VPN profile list'),
    S('vpn_remote', 'vpn', 'cli.vpn.remote', 'Remote VPN users'),
    S('vpn_graph', 'vpn', 'cli.vpn.graph', 'VPN graph status'),
    S(
      'vpn_setup',
      'vpn',
      'cli.vpn.setup',
      'Configure a VPN profile (SDK cli.vpn.setup; param is trailing syntax)',
      {
        args: {
          index: z.number().int().min(1).max(128),
          param: safeText(),
        },
      },
    ),
    S(
      'vpn_ovpn',
      'vpn',
      'cli.vpn.ovpn',
      'OpenVPN configuration (SDK cli.vpn.ovpn; param is trailing syntax)',
      { args: { param: safeText() } },
    ),
    S(
      'vpn_dial_out',
      'vpn',
      'cli.vpn.dialout',
      'VPN dial-out (SDK cli.vpn.dialout; param is trailing syntax)',
      {
        args: { param: safeText() },
        toInput: (args) => ({ param: args.param }),
      },
    ),
  ],
};
