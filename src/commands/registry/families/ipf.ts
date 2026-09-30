import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

export const ipfFamily: FamilyDef = {
  family: 'ipf',
  desc: 'IP filter (firewall).',
  commands: [
    // Bare view only — optional flag arrays are not allowlist-expandable.
    S('ipf_view', 'ipf', 'cli.ipf.view', 'IP filter rules view', {
        args: {},
        toInput: () => ({}),
        partial: true,
      }),
    S(
      'ipf_set',
      'ipf',
      'cli.ipf.set',
      'IP filter set (SDK cli.ipf.set canonical forms)',
      {
        args: {
          action: z.enum([
            'callFilterSet',
            'dataFilterSet',
            'defaultAction',
            'acceptRoutingFromWan',
            'strictSecurityFirewall',
            'codePage',
          ]),
          setNo: z.number().int().min(0).max(12).optional(),
          pass: z.boolean().optional(),
          logToSyslog: z.boolean().optional(),
          family: z.enum(['v4', 'v6']).optional(),
          enabled: z.boolean().optional(),
          page: z.number().int().min(0).max(20).optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'callFilterSet':
              return { action: 'callFilterSet', setNo: req(a.setNo as number | undefined, 'setNo') };
            case 'dataFilterSet':
              return { action: 'dataFilterSet', setNo: req(a.setNo as number | undefined, 'setNo') };
            case 'defaultAction':
              return {
                action: 'defaultAction',
                pass: req(a.pass as boolean | undefined, 'pass'),
                logToSyslog: req(a.logToSyslog as boolean | undefined, 'logToSyslog'),
              };
            case 'acceptRoutingFromWan':
              return {
                action: 'acceptRoutingFromWan',
                family: req(a.family as string | undefined, 'family'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'strictSecurityFirewall':
              return {
                action: 'strictSecurityFirewall',
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'codePage':
              return { action: 'codePage', page: req(a.page as number | undefined, 'page') };
            default:
              throw new Error('invalid ipf_set action');
          }
        },
      },
    ),
    S(
      'ipf_rule',
      'ipf',
      'cli.ipf.rule',
      'IP filter rule (SDK cli.ipf.rule canonical -v/-e/-D forms)',
      {
        args: {
          setNo: z.number().int().min(1).max(50),
          ruleNo: z.number().int().min(1).max(30),
          action: z.enum(['view', 'enable', 'direction']),
          enabled: z.boolean().optional(),
          direction: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
        },
        toInput: (a) => {
          const setNo = req(a.setNo as number | undefined, 'setNo');
          const ruleNo = req(a.ruleNo as number | undefined, 'ruleNo');
          switch (a.action) {
            case 'view':
              return { setNo, ruleNo, action: 'view' };
            case 'enable':
              return { setNo, ruleNo, action: 'enable', enabled: req(a.enabled as boolean | undefined, 'enabled') };
            case 'direction':
              return {
                setNo,
                ruleNo,
                action: 'direction',
                direction: req(a.direction as 0 | 1 | 2 | 3 | undefined, 'direction'),
              };
            default:
              throw new Error('invalid ipf_rule action');
          }
        },
      },
    ),
    S(
      'ipf_flowtrack_view',
      'ipf',
      'cli.ipf.flowtrack.view',
      'IP filter flowtrack view (-f sessions / -b all)',
      {
        args: { mode: z.enum(['sessions', 'all']) },
        toInput: (a) => ({ mode: req(a.mode as string | undefined, 'mode') }),
      },
    ),
    S(
      'ipf_flowtrack_set',
      'ipf',
      'cli.ipf.flowtrack.set',
      'IP filter flowtrack set (-r refresh / -e enable)',
      {
        args: { action: z.enum(['refresh', 'enable']) },
        toInput: (a) => ({ action: req(a.action as string | undefined, 'action') }),
      },
    ),
  ],
};
