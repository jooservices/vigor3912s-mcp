import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { safeText } from '../../validators.js';

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

export const csmFamily: FamilyDef = {
  family: 'csm',
  desc: 'Content security management.',
  commands: [
    S(
      'csm_appe_show',
      'csm',
      'cli.csm.appe.show',
      'APP enforcement profile view (optional group filter)',
      {
        args: {
          group: z.enum(['all', 'im', 'p2p', 'protocol', 'others']).optional(),
        },
        // Default `toInput` maps `{}` to `undefined` (void-op shorthand), but
        // this op's input is `{ group?: ... }`, not `void` — always pass an
        // object so `input.group === undefined` (not `input` itself) drives
        // the bare-`csm appe show` branch.
        toInput: (a) => ({ group: a.group }),
      },
    ),
    S(
      'csm_appe_set',
      'csm',
      'cli.csm.appe.set',
      'APP enforcement set (SDK cli.csm.appe.set)',
      {
        args: {
          index: z.number().int().min(1).max(32),
          action: z.enum(['view', 'enable', 'disable', 'enableRoute', 'disableRoute']),
          group: z.enum(['IM', 'P2P', 'Protocol', 'Others']).optional(),
          appIndex: z.number().int().positive().optional(),
        },
        toInput: (a) => {
          const index = req(a.index as number | undefined, 'index');
          switch (a.action) {
            case 'view':
              return { index, action: 'view', group: req(a.group as string | undefined, 'group') };
            case 'enable':
              return {
                index,
                action: 'enable',
                appIndex: req(a.appIndex as number | undefined, 'appIndex'),
              };
            case 'disable':
              return {
                index,
                action: 'disable',
                appIndex: req(a.appIndex as number | undefined, 'appIndex'),
              };
            case 'enableRoute':
              return {
                index,
                action: 'enableRoute',
                appIndex: req(a.appIndex as number | undefined, 'appIndex'),
              };
            case 'disableRoute':
              return {
                index,
                action: 'disableRoute',
                appIndex: req(a.appIndex as number | undefined, 'appIndex'),
              };
            default:
              throw new Error('invalid csm_appe_set action');
          }
        },
      },
    ),
    S('csm_ucf', 'csm', 'cli.csm.ucf', 'URL content filter (SDK cli.csm.ucf canonical forms)', {
      args: {
        action: z.enum(['show', 'setdefault', 'message', 'objName', 'objPriority', 'objLog']),
        message: safeText(255).optional(),
        index: z.number().int().min(1).max(8).optional(),
        name: safeText(15).optional(),
        value: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
        logType: z.enum(['P', 'B', 'A']).optional(),
      },
      toInput: (a) => {
        switch (a.action) {
          case 'show':
            return { action: 'show' };
          case 'setdefault':
            return { action: 'setdefault' };
          case 'message':
            return { action: 'message', message: req(a.message as string | undefined, 'message') };
          case 'objName':
            return {
              action: 'objName',
              index: req(a.index as number | undefined, 'index'),
              name: req(a.name as string | undefined, 'name'),
            };
          case 'objPriority':
            return {
              action: 'objPriority',
              index: req(a.index as number | undefined, 'index'),
              value: req(a.value as number | undefined, 'value'),
            };
          case 'objLog':
            return {
              action: 'objLog',
              index: req(a.index as number | undefined, 'index'),
              logType: req(a.logType as string | undefined, 'logType'),
            };
          default:
            throw new Error('invalid csm_ucf action');
        }
      },
    }),
    S('csm_wcf', 'csm', 'cli.csm.wcf', 'Web content filter (SDK cli.csm.wcf canonical forms)', {
      args: {
        action: z.enum([
          'show',
          'look',
          'cache',
          'server',
          'message',
          'setdefault',
          'objView',
          'objAction',
          'objName',
          'objLog',
        ]),
        server: safeText().optional(),
        message: safeText(255).optional(),
        index: z.number().int().min(1).max(8).optional(),
        objAction: z.enum(['P', 'B']).optional(),
        name: safeText(15).optional(),
        logType: z.enum(['P', 'B', 'A']).optional(),
      },
      toInput: (a) => {
        switch (a.action) {
          case 'show':
            return { action: 'show' };
          case 'look':
            return { action: 'look' };
          case 'cache':
            return { action: 'cache' };
          case 'server':
            return { action: 'server', server: req(a.server as string | undefined, 'server') };
          case 'message':
            return { action: 'message', message: req(a.message as string | undefined, 'message') };
          case 'setdefault':
            return { action: 'setdefault' };
          case 'objView':
            return { action: 'objView', index: req(a.index as number | undefined, 'index') };
          case 'objAction':
            return {
              action: 'objAction',
              index: req(a.index as number | undefined, 'index'),
              value: req(a.objAction as string | undefined, 'objAction'),
            };
          case 'objName':
            return {
              action: 'objName',
              index: req(a.index as number | undefined, 'index'),
              name: req(a.name as string | undefined, 'name'),
            };
          case 'objLog':
            return {
              action: 'objLog',
              index: req(a.index as number | undefined, 'index'),
              logType: req(a.logType as string | undefined, 'logType'),
            };
          default:
            throw new Error('invalid csm_wcf action');
        }
      },
    }),
    S('csm_dnsf', 'csm', 'cli.csm.dnsf', 'DNS filter (SDK cli.csm.dnsf canonical forms)', {
      args: {
        action: z.enum([
          'enable',
          'syslog',
          'wcf',
          'ucf',
          'cachetime',
          'blockpage',
          'profileShow',
          'profileEditName',
          'profileEditLog',
          'profileSetdefault',
        ]),
        state: z.enum(['ON', 'OFF']).optional(),
        value: z.enum(['N', 'P', 'B', 'A']).optional(),
        index: z.number().int().min(1).optional(),
        hours: z.number().int().min(1).max(24).optional(),
        blockpage: z.enum(['show', 'on', 'off']).optional(),
        name: safeText().optional(),
        logType: z.enum(['P', 'B', 'A']).optional(),
      },
      toInput: (a) => {
        switch (a.action) {
          case 'enable':
            return { action: 'enable', state: req(a.state as string | undefined, 'state') };
          case 'syslog':
            return { action: 'syslog', value: req(a.value as string | undefined, 'value') };
          case 'wcf':
            return { action: 'wcf', index: req(a.index as number | undefined, 'index') };
          case 'ucf':
            return { action: 'ucf', index: req(a.index as number | undefined, 'index') };
          case 'cachetime':
            return { action: 'cachetime', hours: req(a.hours as number | undefined, 'hours') };
          case 'blockpage':
            return {
              action: 'blockpage',
              value: req(a.blockpage as string | undefined, 'blockpage'),
            };
          case 'profileShow':
            return { action: 'profileShow' };
          case 'profileEditName':
            return {
              action: 'profileEditName',
              index: req(a.index as number | undefined, 'index'),
              name: req(a.name as string | undefined, 'name'),
            };
          case 'profileEditLog':
            return {
              action: 'profileEditLog',
              index: req(a.index as number | undefined, 'index'),
              logType: req(a.logType as string | undefined, 'logType'),
            };
          case 'profileSetdefault':
            return { action: 'profileSetdefault' };
          default:
            throw new Error('invalid csm_dnsf action');
        }
      },
    }),
  ],
};
