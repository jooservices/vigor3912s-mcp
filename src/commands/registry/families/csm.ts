import { z } from 'zod';
import { R, Ra, W } from '../builders.js';
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
    Ra(
      'csm_appe_show',
      'csm',
      (a) => {
        if (!a.group) return 'csm appe show';
        const flag = { all: '-a', im: '-i', p2p: '-p', protocol: '-t', others: '-m' }[
          String(a.group) as 'all'
        ];
        return `csm appe show ${flag}`;
      },
      {
        group: z.enum(['all', 'im', 'p2p', 'protocol', 'others']).optional(),
      },
      'APP enforcement profile view (optional group filter)',
    ),
    W(
      'csm_appe_set',
      'csm',
      (a) => {
        const index = req(a.index as number | undefined, 'index');
        const prefix = `csm appe set -i ${index}`;
        switch (a.action) {
          case 'view':
            return `${prefix} -v ${req(a.group as string | undefined, 'group')}`;
          case 'enable':
            return `${prefix} -e ${req(a.appIndex as number | undefined, 'appIndex')}`;
          case 'disable':
            return `${prefix} -d ${req(a.appIndex as number | undefined, 'appIndex')}`;
          case 'enableRoute':
            return `${prefix} -p ${req(a.appIndex as number | undefined, 'appIndex')}`;
          case 'disableRoute':
            return `${prefix} -q ${req(a.appIndex as number | undefined, 'appIndex')}`;
          default:
            throw new Error('invalid csm_appe_set action');
        }
      },
      {
        index: z.number().int().min(1).max(32),
        action: z.enum(['view', 'enable', 'disable', 'enableRoute', 'disableRoute']),
        group: z.enum(['IM', 'P2P', 'Protocol', 'Others']).optional(),
        appIndex: z.number().int().positive().optional(),
      },
      'APP enforcement set (SDK cli.csm.appe.set)',
    ),
    W(
      'csm_ucf',
      'csm',
      (a) => {
        switch (a.action) {
          case 'show':
            return 'csm ucf show';
          case 'setdefault':
            return 'csm ucf setdefault';
          case 'message':
            return `csm ucf msg ${req(a.message as string | undefined, 'message')}`;
          case 'objName':
            return `csm ucf obj ${req(a.index as number | undefined, 'index')} -n ${req(a.name as string | undefined, 'name')}`;
          case 'objPriority':
            return `csm ucf obj ${req(a.index as number | undefined, 'index')} -p ${req(a.value as number | undefined, 'value')}`;
          case 'objLog':
            return `csm ucf obj ${req(a.index as number | undefined, 'index')} -l ${req(a.logType as string | undefined, 'logType')}`;
          default:
            throw new Error('invalid csm_ucf action');
        }
      },
      {
        action: z.enum(['show', 'setdefault', 'message', 'objName', 'objPriority', 'objLog']),
        message: safeText(255).optional(),
        index: z.number().int().min(1).max(8).optional(),
        name: safeText(15).optional(),
        value: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
        logType: z.enum(['P', 'B', 'A']).optional(),
      },
      'URL content filter (SDK cli.csm.ucf canonical forms)',
    ),
    W(
      'csm_wcf',
      'csm',
      (a) => {
        switch (a.action) {
          case 'show':
            return 'csm wcf show';
          case 'look':
            return 'csm wcf look';
          case 'cache':
            return 'csm wcf cache';
          case 'server':
            return `csm wcf server ${req(a.server as string | undefined, 'server')}`;
          case 'message':
            return `csm wcf msg ${req(a.message as string | undefined, 'message')}`;
          case 'setdefault':
            return 'csm wcf setdefault';
          case 'objView':
            return `csm wcf obj ${req(a.index as number | undefined, 'index')} -v`;
          case 'objAction':
            return `csm wcf obj ${req(a.index as number | undefined, 'index')} -a ${req(a.objAction as string | undefined, 'objAction')}`;
          case 'objName':
            return `csm wcf obj ${req(a.index as number | undefined, 'index')} -n ${req(a.name as string | undefined, 'name')}`;
          case 'objLog':
            return `csm wcf obj ${req(a.index as number | undefined, 'index')} -l ${req(a.logType as string | undefined, 'logType')}`;
          default:
            throw new Error('invalid csm_wcf action');
        }
      },
      {
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
      'Web content filter (SDK cli.csm.wcf canonical forms)',
    ),
    W(
      'csm_dnsf',
      'csm',
      (a) => {
        switch (a.action) {
          case 'enable':
            return `csm dnsf enable ${req(a.state as string | undefined, 'state')}`;
          case 'syslog':
            return `csm dnsf syslog ${req(a.value as string | undefined, 'value')}`;
          case 'wcf':
            return `csm dnsf wcf ${req(a.index as number | undefined, 'index')}`;
          case 'ucf':
            return `csm dnsf ucf ${req(a.index as number | undefined, 'index')}`;
          case 'cachetime':
            return `csm dnsf cachetime ${req(a.hours as number | undefined, 'hours')}`;
          case 'blockpage':
            return `csm dnsf blockpage ${req(a.blockpage as string | undefined, 'blockpage')}`;
          case 'profileShow':
            return 'csm dnsf profile_show';
          case 'profileEditName':
            return `csm dnsf profile_edit ${req(a.index as number | undefined, 'index')} -n ${req(a.name as string | undefined, 'name')}`;
          case 'profileEditLog':
            return `csm dnsf profile_edit ${req(a.index as number | undefined, 'index')} -l ${req(a.logType as string | undefined, 'logType')}`;
          case 'profileSetdefault':
            return 'csm dnsf profile_setdefault';
          default:
            throw new Error('invalid csm_dnsf action');
        }
      },
      {
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
      'DNS filter (SDK cli.csm.dnsf canonical forms)',
    ),
  ],
};
