import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  parseWanStatus,
} from '../../../tools/parsers.js';
import {
  ipv4,
  onOff,
  safeText,
  wanIdx,
} from '../../validators.js';

export const wanFamily: FamilyDef = {
    family: 'wan',
    desc: 'WAN interface configuration and status.',
    commands: [
      R('wan_status', 'wan', 'wan status', 'Per-WAN link state, mode, IP, gateway, traffic, DNS', parseWanStatus),
      R('wan_detect', 'wan', 'wan detect', 'WAN connection detection status'),
      R('wan_detect_mtu', 'wan', 'wan detect_mtu', 'WAN MTU detection status'),
      R('wan_detect_mtu6', 'wan', 'wan detect_mtu6', 'IPv6 WAN MTU detection status'),
      W('wan_enable', 'wan', (a) => `wan enable WAN${a.wan}`, { wan: wanIdx }, 'Enable a WAN interface'),
      W('wan_disable', 'wan', (a) => `wan disable WAN${a.wan}`, { wan: wanIdx }, 'Disable a WAN interface'),
      W('wan_mtu', 'wan', (a) => `wan mtu WAN${a.wan} ${a.mtu}`, { wan: wanIdx, mtu: z.number().int().min(576).max(1500) }, 'Set WAN MTU'),
      W('wan_dns', 'wan', (a) => `wan dns WAN${a.wan} ${a.primary} ${a.secondary ?? ''}`.trim(), {
        wan: wanIdx,
        primary: ipv4,
        secondary: ipv4.optional(),
      }, 'Set WAN DNS servers'),
      W('wan_forward', 'wan', (a) => `wan forward ${a.onoff}`, { onoff: onOff }, 'Enable/disable inter-WAN forwarding'),
      W('wan_failover', 'wan', (a) => `wan failover ${String(a.param)}`, { param: safeText() }, 'Configure WAN failover'),
      W('wan_lb', 'wan', (a) => `wan lb ${String(a.param)}`, { param: safeText() }, 'Configure WAN load balancing'),
      W('wan_budget', 'wan', (a) => `wan budget ${String(a.param)}`, { param: safeText() }, 'Configure WAN data budget'),
      W('wan_vlan', 'wan', (a) => `wan vlan WAN${a.wan} ${a.vid}`, { wan: wanIdx, vid: z.number().int().min(1).max(4094) }, 'Set WAN VLAN tag'),
    ],
  };
