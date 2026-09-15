import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

/** SDK keeps trailing VPN syntax as opaque `param` (canonical). */
export const vpnFamily: FamilyDef = {
  family: 'vpn',
  desc: 'VPN configuration (mostly write).',
  commands: [
    R('vpn_list', 'vpn', 'vpn list', 'VPN profile list'),
    R('vpn_remote', 'vpn', 'vpn remote', 'Remote VPN users'),
    R('vpn_graph', 'vpn', 'vpn graph', 'VPN graph status'),
    W(
      'vpn_setup',
      'vpn',
      (a) => `vpn setup ${a.index} ${String(a.param)}`,
      {
        index: z.number().int().min(1).max(128),
        param: safeText(),
      },
      'Configure a VPN profile (SDK cli.vpn.setup; param is trailing syntax)',
    ),
    W(
      'vpn_ovpn',
      'vpn',
      (a) => `vpn ovpn ${String(a.param)}`,
      { param: safeText() },
      'OpenVPN configuration (SDK cli.vpn.ovpn; param is trailing syntax)',
    ),
    W(
      'vpn_dial_out',
      'vpn',
      (a) => `vpn dial_out ${String(a.param)}`,
      { param: safeText() },
      'VPN dial-out (SDK cli.vpn.dialout; param is trailing syntax)',
    ),
  ],
};
