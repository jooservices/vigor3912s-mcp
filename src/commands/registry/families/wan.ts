import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { onOff, wanIdx } from '../../validators.js';

export const wanFamily: FamilyDef = {
  family: 'wan',
  desc: 'WAN interface configuration and status.',
  commands: [
    S('wan_status', 'wan', 'cli.wan.status', 'Per-WAN link state, mode, IP, gateway, traffic, DNS'),
    // DIVERGENCE (D3, SDK correct): CLI reference `wan detect status`
    // (docs/05-3912s-reference/cli-reference-raw.txt ~line 10937/10981) is the
    // documented read query; the prior curated tool rendered the bare `wan
    // detect` heading token, which is not itself a valid query form.
    S('wan_detect', 'wan', 'cli.wan.detect', 'WAN connection detection status'),
    // DIVERGENCE (D3, SDK correct): CLI reference (~line 11291/11309) documents
    // `wan detect_mtu -i <host> -s <mtu_size> -d <decrease> -w <wan#> -c
    // <count>` — there is no bare/no-arg form. The prior curated tool rendered
    // a static `wan detect_mtu` with no args; the tool now takes the
    // documented parameters (SDK-derived args).
    S('wan_detect_mtu', 'wan', 'cli.wan.detectmtu', 'WAN MTU detection status (probe with target host/size/decrease/wan/count)'),
    // DIVERGENCE (D3, SDK correct): CLI reference (~line 11317/11333) documents
    // `wan detect_mtu6 -i <host> -s <mtu_size> -w <wan#>` — no bare form. Same
    // resolution as wan_detect_mtu above.
    S('wan_detect_mtu6', 'wan', 'cli.wan.detectmtu6', 'IPv6 WAN MTU detection status (probe with target host/size/wan)'),
    S('wan_enable', 'wan', 'cli.wan.enable', 'Enable a WAN interface', {
      args: { wan: wanIdx },
      toInput: (a) => ({ wanInterface: a.wan }),
    }),
    S('wan_disable', 'wan', 'cli.wan.disable', 'Disable a WAN interface', {
      args: { wan: wanIdx },
      toInput: (a) => ({ wanInterface: a.wan }),
    }),
    // DIVERGENCE (D3, SDK correct): CLI reference (~line 10804-10817) documents
    // `wan mtu <value>` / `wan mtu2 <value>` — a single global MTU setting
    // (target mtu|mtu2 + value 1000-1500), with no per-WAN-number form. The
    // prior curated tool rendered a fabricated `wan mtu WAN<n> <mtu>` syntax
    // that does not match the documented command; the tool's args now follow
    // the SDK-derived shape (target, value).
    S('wan_mtu', 'wan', 'cli.wan.mtu.mtu2', 'Set global WAN MTU (mtu|mtu2 target, value 1000-1500)'),
    // DIVERGENCE (D3, SDK correct): CLI reference (~line 10827-10849) documents
    // `wan dns <wan_no><dns_select><ipv4_addr>` — one selector (pri/sec) and
    // one address per call. The prior curated tool rendered a fabricated
    // `wan dns WAN<n> <primary> <secondary>` syntax setting two addresses in
    // one call, which does not match the documented command; the tool's args
    // now follow the SDK-derived shape (wanNo, dnsSelect, ipv4Address).
    S('wan_dns', 'wan', 'cli.wan.dns', 'Set one WAN DNS server (primary or secondary) via wan_no/dns_select/ipv4_addr'),
    S('wan_forward', 'wan', 'cli.wan.forward', 'Enable/disable inter-WAN forwarding', {
      args: { onoff: onOff },
      toInput: (a) => ({ state: a.onoff }),
    }),
    S(
      'wan_failover',
      'wan',
      'cli.wan.failover',
      'WAN failover (off|show <index> | on <failoverWan> …)',
      {
        args: {
          action: z.enum(['off', 'show', 'on']),
          index: z.number().int().min(1).max(12).optional(),
          failoverWan: z.number().int().min(1).max(7).optional(),
          disconnectActionEnabled: z.boolean().optional(),
          anyOrAllActionEnabled: z.boolean().optional(),
          mainWan: z.number().int().min(1).max(7).optional(),
          downloadThresholdKbps: z.number().int().min(0).optional(),
          uploadThresholdKbps: z.number().int().min(0).optional(),
        },
        toInput: (a) => {
          if (a.action === 'off' || a.action === 'show') {
            if (a.index == null) throw new Error('index is required for failover off|show');
            return { action: a.action, index: a.index };
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
          return {
            action: 'on',
            failoverWan: a.failoverWan,
            disconnectActionEnabled: a.disconnectActionEnabled,
            anyOrAllActionEnabled: a.anyOrAllActionEnabled,
            mainWan: a.mainWan,
            downloadThresholdKbps: a.downloadThresholdKbps,
            uploadThresholdKbps: a.uploadThresholdKbps,
          };
        },
      },
    ),
    S('wan_lb', 'wan', 'cli.wan.lb', 'WAN load-balance membership (wan lb wanN on|off)', {
      args: {
        wanInterface: z.string().regex(/^wan([1-9]|1[0-2])$/),
        state: onOff,
      },
    }),
    S(
      'wan_budget',
      'wan',
      'cli.wan.budget',
      'WAN data budget (state enable/disable | thres MB | gthres GB)',
      {
        args: {
          wan: wanIdx,
          action: z.enum(['state', 'thresholdMb', 'thresholdGb']),
          enabled: z.boolean().optional(),
          limitMb: z.number().int().positive().optional(),
          limitGb: z.number().int().positive().optional(),
        },
        toInput: (a) => {
          if (a.action === 'state') {
            if (a.enabled == null) throw new Error('enabled is required for budget state');
            return { wanInterface: a.wan, action: 'state', enabled: a.enabled };
          }
          if (a.action === 'thresholdMb') {
            if (a.limitMb == null) throw new Error('limitMb is required for thresholdMb');
            return { wanInterface: a.wan, action: 'thresholdMb', limitMb: a.limitMb };
          }
          if (a.limitGb == null) throw new Error('limitGb is required for thresholdGb');
          return { wanInterface: a.wan, action: 'thresholdGb', limitGb: a.limitGb };
        },
      },
    ),
    S('wan_vlan', 'wan', 'cli.wan.vlan', 'WAN VLAN tag/state/priority (SDK cli.wan.vlan)', {
      args: {
        wan: wanIdx,
        action: z.enum(['tag', 'state', 'priority']),
        tagValue: z.number().int().min(-1).max(4095).optional(),
        enabled: z.boolean().optional(),
        priority: z.number().int().min(0).max(7).optional(),
      },
      toInput: (a) => {
        if (a.action === 'tag') {
          if (a.tagValue == null) throw new Error('tagValue is required for vlan tag');
          return { wanInterface: a.wan, action: 'tag', tagValue: a.tagValue };
        }
        if (a.action === 'state') {
          if (a.enabled == null) throw new Error('enabled is required for vlan state');
          return { wanInterface: a.wan, action: 'state', enabled: a.enabled };
        }
        if (a.priority == null) throw new Error('priority is required for vlan priority');
        return { wanInterface: a.wan, action: 'priority', priority: a.priority };
      },
    }),
  ],
};
