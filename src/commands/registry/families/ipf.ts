import { z } from 'zod';
import { R, Ra, W } from '../builders.js';
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
    R('ipf_view', 'ipf', 'ipf view', 'IP filter rules view'),
    W(
      'ipf_set',
      'ipf',
      (a) => {
        switch (a.action) {
          case 'callFilterSet':
            return `ipf set -c ${req(a.setNo as number | undefined, 'setNo')}`;
          case 'dataFilterSet':
            return `ipf set -d ${req(a.setNo as number | undefined, 'setNo')}`;
          case 'defaultAction': {
            const pass = req(a.pass as boolean | undefined, 'pass');
            const logToSyslog = req(a.logToSyslog as boolean | undefined, 'logToSyslog');
            return `ipf set -p ${pass ? 0 : 1} ${logToSyslog ? 1 : 0}`;
          }
          case 'acceptRoutingFromWan': {
            const family = req(a.family as string | undefined, 'family');
            const enabled = req(a.enabled as boolean | undefined, 'enabled');
            return `ipf set -R ${family} ${enabled ? 0 : 1}`;
          }
          case 'strictSecurityFirewall': {
            const enabled = req(a.enabled as boolean | undefined, 'enabled');
            return `ipf set -L ${enabled ? 1 : 0}`;
          }
          case 'codePage':
            return `ipf set -C ${req(a.page as number | undefined, 'page')}`;
          default:
            throw new Error('invalid ipf_set action');
        }
      },
      {
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
      'IP filter set (SDK cli.ipf.set canonical forms)',
    ),
    W(
      'ipf_rule',
      'ipf',
      (a) => {
        const setNo = req(a.setNo as number | undefined, 'setNo');
        const ruleNo = req(a.ruleNo as number | undefined, 'ruleNo');
        const prefix = `ipf rule ${setNo} ${ruleNo}`;
        switch (a.action) {
          case 'view':
            return `${prefix} -v`;
          case 'enable': {
            const enabled = req(a.enabled as boolean | undefined, 'enabled');
            return `${prefix} -e ${enabled ? '1' : '0'}`;
          }
          case 'direction':
            return `${prefix} -D ${req(a.direction as number | undefined, 'direction')}`;
          default:
            throw new Error('invalid ipf_rule action');
        }
      },
      {
        setNo: z.number().int().min(1).max(50),
        ruleNo: z.number().int().min(1).max(30),
        action: z.enum(['view', 'enable', 'direction']),
        enabled: z.boolean().optional(),
        direction: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      },
      'IP filter rule (SDK cli.ipf.rule canonical -v/-e/-D forms)',
    ),
    Ra(
      'ipf_flowtrack_view',
      'ipf',
      (a) => {
        const mode = req(a.mode as string | undefined, 'mode');
        return `ipf flowtrack view ${mode === 'sessions' ? '-f' : '-b'}`;
      },
      { mode: z.enum(['sessions', 'all']) },
      'IP filter flowtrack view (-f sessions / -b all)',
    ),
    W(
      'ipf_flowtrack_set',
      'ipf',
      (a) => {
        const action = req(a.action as string | undefined, 'action');
        return `ipf flowtrack set ${action === 'refresh' ? '-r' : '-e'}`;
      },
      { action: z.enum(['refresh', 'enable']) },
      'IP filter flowtrack set (-r refresh / -e enable)',
    ),
  ],
};
