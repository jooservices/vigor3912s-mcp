import { z } from 'zod';
import { R, S, W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { ipv4, safeText } from '../../validators.js';

/** SWM MAC is 12 hex digits (no separators) per SDK/UG. */
const swmMac = z.string().regex(/^[0-9A-Fa-f]{12}$/, 'expected 12 hex-digit MAC');

/** Single token (no whitespace) for SWM free-text fields. */
const swmToken = safeText().refine((v) => !/\s/.test(v), {
  message: 'must be a single token with no whitespace',
});

function req<T>(v: T | undefined | null, name: string): T {
  if (v == null) throw new Error(`${name} is required`);
  return v;
}

/**
 * SWM tools mirror SDK discriminated action unions (canonical UG forms).
 * `swm_tr069` has no SDK TypedOperation — kept as token args.
 * `swm_show` / `swm_get` use the complete SDK argument shapes. Their former
 * zero-argument forms were not valid documented commands.
 */
export const swmFamily: FamilyDef = {
  family: 'swm',
  desc: 'Switch/AP management service.',
  commands: [
    S('swm_show', 'swm', 'cli.swm.show', 'Switch management status'),
    S('swm_get', 'swm', 'cli.swm.get', 'Switch management data'),
    // partial: cli.swm.enable.disable also covers the `disable` variant.
    S('swm_enable', 'swm', 'cli.swm.enable.disable', 'Enable switch management', {
        args: {},
        toInput: () => ({ action: 'enable' }),
        partial: true,
      }),
    // partial: cli.swm.enable.disable also covers the `enable` variant.
    S('swm_disable', 'swm', 'cli.swm.enable.disable', 'Disable switch management', {
        args: {},
        toInput: () => ({ action: 'disable' }),
        partial: true,
      }),
    S('swm_post', 'swm', 'cli.swm.post', 'Push config to switch by MAC (swm post <12-hex-mac>)', {
      args: { mac: swmMac },
      toInput: (a) => ({ mac: a.mac as string }),
    }),
    S(
      'swm_group',
      'swm',
      'cli.swm.group',
      'Switch group (SDK cli.swm.group)',
      {
        args: {
          action: z.enum(['setWithPassword', 'setNoPassword', 'show', 'add', 'delete']),
          idx: z.number().int().min(1).max(10).optional(),
          name: swmToken.optional(),
          password: swmToken.optional(),
          mac: swmMac.optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'setWithPassword':
              return {
                action: 'setWithPassword',
                idx: req(a.idx as number | undefined, 'idx'),
                name: req(a.name as string | undefined, 'name'),
                password: req(a.password as string | undefined, 'password'),
              };
            case 'setNoPassword':
              return {
                action: 'setNoPassword',
                idx: req(a.idx as number | undefined, 'idx'),
                name: req(a.name as string | undefined, 'name'),
              };
            case 'show':
              return { action: 'show' };
            case 'add':
              return {
                action: 'add',
                idx: req(a.idx as number | undefined, 'idx'),
                mac: req(a.mac as string | undefined, 'mac'),
              };
            case 'delete':
              return {
                action: 'delete',
                idx: req(a.idx as number | undefined, 'idx'),
                mac: req(a.mac as string | undefined, 'mac'),
              };
            default:
              throw new Error('invalid swm_group action');
          }
        },
      },
    ),
    S(
      'swm_profile',
      'swm',
      'cli.swm.profile',
      'Switch profile (SDK cli.swm.profile)',
      {
        args: {
          action: z.enum(['add', 'delete', 'show', 'enableAll', 'disableAll']),
          mac: swmMac.optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'add':
              return { action: 'add', mac: req(a.mac as string | undefined, 'mac') };
            case 'delete':
              return { action: 'delete', mac: req(a.mac as string | undefined, 'mac') };
            case 'show':
              return { action: 'show' };
            case 'enableAll':
              return { action: 'enableAll', mac: req(a.mac as string | undefined, 'mac') };
            case 'disableAll':
              return { action: 'disableAll', mac: req(a.mac as string | undefined, 'mac') };
            default:
              throw new Error('invalid swm_profile action');
          }
        },
      },
    ),
    S(
      'swm_detail',
      'swm',
      'cli.swm.detail',
      'Switch detail (SDK cli.swm.detail)',
      {
        args: {
          action: z.enum([
            'comment',
            'name',
            'passwd',
            'config',
            'show',
            'portShow',
            'port',
            'rateToggle',
            'rateLimit',
          ]),
          mac: swmMac.optional(),
          comment: swmToken.optional(),
          name: swmToken.optional(),
          password: swmToken.optional(),
          configIndex: z.number().int().min(0).optional(),
          port: z.number().int().min(1).max(28).optional(),
          flag: swmToken.optional(),
          schedule1: z.number().int().min(0).optional(),
          schedule2: z.number().int().min(0).optional(),
          description: swmToken.optional(),
          direction: z.enum(['i', 'e']).optional(),
          enabled: z.boolean().optional(),
          limit: z.number().int().positive().optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'comment':
              return {
                action: 'comment',
                mac: req(a.mac as string | undefined, 'mac'),
                comment: req(a.comment as string | undefined, 'comment'),
              };
            case 'name':
              return {
                action: 'name',
                mac: req(a.mac as string | undefined, 'mac'),
                name: req(a.name as string | undefined, 'name'),
              };
            case 'passwd':
              return {
                action: 'passwd',
                mac: req(a.mac as string | undefined, 'mac'),
                password: req(a.password as string | undefined, 'password'),
              };
            case 'config':
              return {
                action: 'config',
                mac: req(a.mac as string | undefined, 'mac'),
                configIndex: req(a.configIndex as number | undefined, 'configIndex'),
              };
            case 'show':
              return { action: 'show' };
            case 'portShow':
              return { action: 'portShow', mac: req(a.mac as string | undefined, 'mac') };
            case 'port':
              return {
                action: 'port',
                mac: req(a.mac as string | undefined, 'mac'),
                port: req(a.port as number | undefined, 'port'),
                flag: req(a.flag as string | undefined, 'flag'),
                schedule1: req(a.schedule1 as number | undefined, 'schedule1'),
                schedule2: req(a.schedule2 as number | undefined, 'schedule2'),
                description: req(a.description as string | undefined, 'description'),
              };
            case 'rateToggle':
              return {
                action: 'rateToggle',
                mac: req(a.mac as string | undefined, 'mac'),
                port: req(a.port as number | undefined, 'port'),
                direction: req(a.direction as 'i' | 'e' | undefined, 'direction'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'rateLimit':
              return {
                action: 'rateLimit',
                mac: req(a.mac as string | undefined, 'mac'),
                port: req(a.port as number | undefined, 'port'),
                direction: req(a.direction as 'i' | 'e' | undefined, 'direction'),
                limit: req(a.limit as number | undefined, 'limit'),
              };
            default:
              throw new Error('invalid swm_detail action');
          }
        },
      },
    ),
    S(
      'swm_maintain',
      'swm',
      'cli.swm.maintain',
      'Switch maintain (SDK cli.swm.maintain)',
      {
        args: {
          action: z.enum(['reboot', 'reset', 'show']),
          mac: swmMac.optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'reboot':
              return { action: 'reboot', mac: req(a.mac as string | undefined, 'mac') };
            case 'reset':
              return { action: 'reset', mac: req(a.mac as string | undefined, 'mac') };
            case 'show':
              return { action: 'show' };
            default:
              throw new Error('invalid swm_maintain action');
          }
        },
      },
    ),
    S(
      'swm_search',
      'swm',
      'cli.swm.search',
      'Switch search (SDK cli.swm.search)',
      {
        args: {
          action: z.enum(['mac', 'ip', 'description']),
          mac: swmMac.optional(),
          ip: ipv4.optional(),
          query: safeText().optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'mac':
              return { action: 'mac', mac: req(a.mac as string | undefined, 'mac') };
            case 'ip':
              return { action: 'ip', ip: req(a.ip as string | undefined, 'ip') };
            case 'description':
              return { action: 'description', query: req(a.query as string | undefined, 'query') };
            default:
              throw new Error('invalid swm_search action');
          }
        },
      },
    ),
    S(
      'swm_db',
      'swm',
      'cli.swm.db',
      'Switch DB (SDK cli.swm.db)',
      {
        args: {
          action: z.enum([
            'ctlToggle',
            'ctlShow',
            'alertNotify',
            'alertAction',
            'alertSms',
            'alertMail',
          ]),
          enabled: z.boolean().optional(),
          mode: z.enum(['N', 'S', 'B']).optional(),
          idx: z.number().int().positive().optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'ctlToggle':
              return { action: 'ctlToggle', enabled: req(a.enabled as boolean | undefined, 'enabled') };
            case 'ctlShow':
              return { action: 'ctlShow' };
            case 'alertNotify':
              return { action: 'alertNotify', mode: req(a.mode as 'N' | 'S' | undefined, 'mode') };
            case 'alertAction':
              return { action: 'alertAction', mode: req(a.mode as 'S' | 'B' | undefined, 'mode') };
            case 'alertSms':
              return { action: 'alertSms', idx: req(a.idx as number | undefined, 'idx') };
            case 'alertMail':
              return { action: 'alertMail', idx: req(a.idx as number | undefined, 'idx') };
            default:
              throw new Error('invalid swm_db action');
          }
        },
      },
    ),
    S(
      'swm_alert',
      'swm',
      'cli.swm.alert',
      'Switch alert (SDK cli.swm.alert canonical forms)',
      {
        args: {
          action: z.enum([
            'toggle',
            'show',
            'actionToggle',
            'setLog',
            'setName',
            'setColor',
            'setNotif',
            'setObject',
            'display',
          ]),
          enabled: z.boolean().optional(),
          idx: z.number().int().min(1).max(8).optional(),
          name: swmToken.optional(),
          color: z.enum(['O', 'R', 'N']).optional(),
          objectIndex: z.number().int().min(1).max(4).optional(),
          objectValue: z.number().int().min(1).max(10).optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'toggle':
              return { action: 'toggle', enabled: req(a.enabled as boolean | undefined, 'enabled') };
            case 'show':
              return { action: 'show' };
            case 'actionToggle':
              return {
                action: 'actionToggle',
                idx: req(a.idx as number | undefined, 'idx'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'setLog':
              return {
                action: 'setLog',
                idx: req(a.idx as number | undefined, 'idx'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'setName':
              return {
                action: 'setName',
                idx: req(a.idx as number | undefined, 'idx'),
                name: req(a.name as string | undefined, 'name'),
              };
            case 'setColor':
              return {
                action: 'setColor',
                idx: req(a.idx as number | undefined, 'idx'),
                color: req(a.color as 'O' | 'R' | 'N' | undefined, 'color'),
              };
            case 'setNotif':
              return {
                action: 'setNotif',
                idx: req(a.idx as number | undefined, 'idx'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'setObject':
              return {
                action: 'setObject',
                idx: req(a.idx as number | undefined, 'idx'),
                objectIndex: req(a.objectIndex as number | undefined, 'objectIndex'),
                objectValue: req(a.objectValue as number | undefined, 'objectValue'),
              };
            case 'display':
              return { action: 'display' };
            default:
              throw new Error('invalid swm_alert action');
          }
        },
      },
    ),
    S(
      'swm_log',
      'swm',
      'cli.swm.log',
      'Switch log (SDK cli.swm.log)',
      {
        args: {
          action: z.enum(['showFilter', 'showDay', 'showWeek', 'setLevel', 'setType', 'setSwitch']),
          idx: z.number().int().min(1).max(8).optional(),
          enabled: z.boolean().optional(),
          mac: swmMac.optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'showFilter':
              return { action: 'showFilter' };
            case 'showDay':
              return { action: 'showDay' };
            case 'showWeek':
              return { action: 'showWeek' };
            case 'setLevel':
              return {
                action: 'setLevel',
                idx: req(a.idx as number | undefined, 'idx'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'setType':
              return {
                action: 'setType',
                idx: req(a.idx as number | undefined, 'idx'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            case 'setSwitch':
              return {
                action: 'setSwitch',
                mac: req(a.mac as string | undefined, 'mac'),
                enabled: req(a.enabled as boolean | undefined, 'enabled'),
              };
            default:
              throw new Error('invalid swm_log action');
          }
        },
      },
    ),
    S(
      'swm_snmp',
      'swm',
      'cli.swm.snmp',
      'Switch SNMP (SDK cli.swm.snmp)',
      {
        args: {
          action: z.enum(['sys', 'iftbl', 'poe', 'trpcomShow', 'trpcomSet']),
          mac: swmMac.optional(),
          portNum: z.number().int().min(1).max(28).optional(),
          name: swmToken.optional(),
        },
        toInput: (a) => {
          switch (a.action) {
            case 'sys':
              return { action: 'sys', mac: req(a.mac as string | undefined, 'mac') };
            case 'iftbl':
              return {
                action: 'iftbl',
                mac: req(a.mac as string | undefined, 'mac'),
                portNum: req(a.portNum as number | undefined, 'portNum'),
              };
            case 'poe':
              return { action: 'poe', mac: req(a.mac as string | undefined, 'mac') };
            case 'trpcomShow':
              return { action: 'trpcomShow', mac: req(a.mac as string | undefined, 'mac') };
            case 'trpcomSet':
              return {
                action: 'trpcomSet',
                mac: req(a.mac as string | undefined, 'mac'),
                name: req(a.name as string | undefined, 'name'),
              };
            default:
              throw new Error('invalid swm_snmp action');
          }
        },
      },
    ),
    W(
      'swm_tr069',
      'swm',
      (a) => `swm tr069 ${(a.args as string[]).join(' ')}`,
      { args: z.array(safeText()).min(1) },
      'Switch TR-069 (no SDK TypedOperation — token args after swm tr069)',
    ),
  ],
};
