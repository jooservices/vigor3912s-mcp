import { z } from 'zod';
import { R, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { ipv4, onOff, wanIdx } from '../../validators.js';

export const wanFamily: FamilyDef = {
  family: 'wan',
  desc: 'WAN interface configuration and status.',
  commands: [
    R('wan_status', 'wan', 'wan status', 'Per-WAN link state, mode, IP, gateway, traffic, DNS'),
    R('wan_detect', 'wan', 'wan detect', 'WAN connection detection status'),
    R('wan_detect_mtu', 'wan', 'wan detect_mtu', 'WAN MTU detection status'),
    R('wan_detect_mtu6', 'wan', 'wan detect_mtu6', 'IPv6 WAN MTU detection status'),
    W('wan_enable', 'wan', (a) => `wan enable WAN${a.wan}`, { wan: wanIdx }, 'Enable a WAN interface'),
    W('wan_disable', 'wan', (a) => `wan disable WAN${a.wan}`, { wan: wanIdx }, 'Disable a WAN interface'),
    W(
      'wan_mtu',
      'wan',
      (a) => `wan mtu WAN${a.wan} ${a.mtu}`,
      { wan: wanIdx, mtu: z.number().int().min(576).max(1500) },
      'Set WAN MTU',
    ),
    W(
      'wan_dns',
      'wan',
      (a) => `wan dns WAN${a.wan} ${a.primary} ${a.secondary ?? ''}`.trim(),
      {
        wan: wanIdx,
        primary: ipv4,
        secondary: ipv4.optional(),
      },
      'Set WAN DNS servers',
    ),
    W('wan_forward', 'wan', (a) => `wan forward ${a.onoff}`, { onoff: onOff }, 'Enable/disable inter-WAN forwarding'),
    W(
      'wan_failover',
      'wan',
      (a) => {
        if (a.action === 'off' || a.action === 'show') {
          if (a.index == null) throw new Error('index is required for failover off|show');
          return `wan failover ${a.action} ${String(a.index)}`;
        }
        for (const key of [
          'failoverWan',
          'disconnectActionEnabled',
          'anyOrAllActionEnabled',
          'mainWan',
          'downloadThresholdKbps',
          'uploadThresholdKbps',
        ] as const) {
          if (a[key] == null) throw new Error(`${key} is required for failover on`);
        }
        return `wan failover on ${String(a.failoverWan)} ${a.disconnectActionEnabled ? 1 : 0} ${a.anyOrAllActionEnabled ? 1 : 0} ${String(a.mainWan)} ${String(a.downloadThresholdKbps)} ${String(a.uploadThresholdKbps)}`;
      },      {
        action: z.enum(['off', 'show', 'on']),
        index: z.number().int().min(1).max(12).optional(),
        failoverWan: z.number().int().min(1).max(7).optional(),
        disconnectActionEnabled: z.boolean().optional(),
        anyOrAllActionEnabled: z.boolean().optional(),
        mainWan: z.number().int().min(1).max(7).optional(),
        downloadThresholdKbps: z.number().int().min(0).optional(),
        uploadThresholdKbps: z.number().int().min(0).optional(),
      },
      'WAN failover (off|show <index> | on <failoverWan> …)',
    ),
    W(
      'wan_lb',
      'wan',
      (a) => `wan lb ${String(a.wanInterface)} ${String(a.state)}`,
      {
        wanInterface: z.string().regex(/^wan([1-9]|1[0-2])$/),
        state: onOff,
      },
      'WAN load-balance membership (wan lb wanN on|off)',
    ),
    W(
      'wan_budget',
      'wan',
      (a) => {
        const prefix = `wan budget wan ${String(a.wan)}`;
        if (a.action === 'state') {
          if (a.enabled == null) throw new Error('enabled is required for budget state');
          return `${prefix} ${a.enabled ? 'enable' : 'disable'}`;
        }
        if (a.action === 'thresholdMb') {
          if (a.limitMb == null) throw new Error('limitMb is required for thresholdMb');
          return `${prefix} thres ${String(a.limitMb)}`;
        }
        if (a.limitGb == null) throw new Error('limitGb is required for thresholdGb');
        return `${prefix} gthres ${String(a.limitGb)}`;
      },      {
        wan: wanIdx,
        action: z.enum(['state', 'thresholdMb', 'thresholdGb']),
        enabled: z.boolean().optional(),
        limitMb: z.number().int().positive().optional(),
        limitGb: z.number().int().positive().optional(),
      },
      'WAN data budget (state enable/disable | thres MB | gthres GB)',
    ),
    W(
      'wan_vlan',
      'wan',
      (a) => {
        const prefix = `wan vlan wan ${String(a.wan)}`;
        if (a.action === 'tag') return `${prefix} tag ${String(a.tagValue)}`;
        if (a.action === 'state') return `${prefix} ${a.enabled ? 'enable' : 'disable'}`;
        return `${prefix} pri ${String(a.priority)}`;
      },
      {
        wan: wanIdx,
        action: z.enum(['tag', 'state', 'priority']),
        tagValue: z.number().int().min(-1).max(4095).optional(),
        enabled: z.boolean().optional(),
        priority: z.number().int().min(0).max(7).optional(),
      },
      'WAN VLAN tag/state/priority (SDK cli.wan.vlan)',
    ),
  ],
};
