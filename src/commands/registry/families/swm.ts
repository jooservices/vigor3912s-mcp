import { z } from 'zod';
import { R, W } from '../builders.js';
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
 */
export const swmFamily: FamilyDef = {
  family: 'swm',
  desc: 'Switch/AP management service.',
  commands: [
    R('swm_show', 'swm', 'swm show', 'Switch management status'),
    R('swm_get', 'swm', 'swm get', 'Switch management data'),
    W('swm_enable', 'swm', () => 'swm enable', {}, 'Enable switch management'),
    W('swm_disable', 'swm', () => 'swm disable', {}, 'Disable switch management'),
    W(
      'swm_post',
      'swm',
      (a) => `swm post ${String(a.mac)}`,
      { mac: swmMac },
      'Push config to switch by MAC (swm post <12-hex-mac>)',
    ),
    W(
      'swm_group',
      'swm',
      (a) => {
        switch (a.action) {
          case 'setWithPassword':
            return `swm group set ${req(a.idx as number | undefined, 'idx')} ${req(a.name as string | undefined, 'name')} 1 ${req(a.password as string | undefined, 'password')}`;
          case 'setNoPassword':
            return `swm group set ${req(a.idx as number | undefined, 'idx')} ${req(a.name as string | undefined, 'name')} 0`;
          case 'show':
            return 'swm group show';
          case 'add':
            return `swm group add ${req(a.idx as number | undefined, 'idx')} ${req(a.mac as string | undefined, 'mac')}`;
          case 'delete':
            return `swm group delete ${req(a.idx as number | undefined, 'idx')} ${req(a.mac as string | undefined, 'mac')}`;
          default:
            throw new Error('invalid swm_group action');
        }
      },
      {
        action: z.enum(['setWithPassword', 'setNoPassword', 'show', 'add', 'delete']),
        idx: z.number().int().min(1).max(10).optional(),
        name: swmToken.optional(),
        password: swmToken.optional(),
        mac: swmMac.optional(),
      },
      'Switch group (SDK cli.swm.group)',
    ),
    W(
      'swm_profile',
      'swm',
      (a) => {
        switch (a.action) {
          case 'add':
            return `swm profile add ${req(a.mac as string | undefined, 'mac')}`;
          case 'delete':
            return `swm profile delete ${req(a.mac as string | undefined, 'mac')}`;
          case 'show':
            return 'swm profile show';
          case 'enableAll':
            return `swm profile enable_all ${req(a.mac as string | undefined, 'mac')}`;
          case 'disableAll':
            return `swm profile disable_all ${req(a.mac as string | undefined, 'mac')}`;
          default:
            throw new Error('invalid swm_profile action');
        }
      },
      {
        action: z.enum(['add', 'delete', 'show', 'enableAll', 'disableAll']),
        mac: swmMac.optional(),
      },
      'Switch profile (SDK cli.swm.profile)',
    ),
    W(
      'swm_detail',
      'swm',
      (a) => {
        switch (a.action) {
          case 'comment':
            return `swm detail comment ${req(a.mac as string | undefined, 'mac')} ${req(a.comment as string | undefined, 'comment')}`;
          case 'name':
            return `swm detail name ${req(a.mac as string | undefined, 'mac')} ${req(a.name as string | undefined, 'name')}`;
          case 'passwd':
            return `swm detail passwd ${req(a.mac as string | undefined, 'mac')} ${req(a.password as string | undefined, 'password')}`;
          case 'config':
            return `swm detail config ${req(a.mac as string | undefined, 'mac')} ${req(a.configIndex as number | undefined, 'configIndex')}`;
          case 'show':
            return 'swm detail show';
          case 'portShow':
            return `swm detail port show ${req(a.mac as string | undefined, 'mac')}`;
          case 'port':
            return `swm detail port ${req(a.mac as string | undefined, 'mac')} ${req(a.port as number | undefined, 'port')} ${req(a.flag as string | undefined, 'flag')} ${req(a.schedule1 as number | undefined, 'schedule1')} ${req(a.schedule2 as number | undefined, 'schedule2')} ${req(a.description as string | undefined, 'description')}`;
          case 'rateToggle': {
            const enabled = req(a.enabled as boolean | undefined, 'enabled');
            return `swm detail rate ${req(a.mac as string | undefined, 'mac')} ${req(a.port as number | undefined, 'port')} ${req(a.direction as string | undefined, 'direction')} ${enabled ? 'e' : 'd'}`;
          }
          case 'rateLimit':
            return `swm detail rate ${req(a.mac as string | undefined, 'mac')} ${req(a.port as number | undefined, 'port')} ${req(a.direction as string | undefined, 'direction')} ${req(a.limit as number | undefined, 'limit')}`;
          default:
            throw new Error('invalid swm_detail action');
        }
      },
      {
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
      'Switch detail (SDK cli.swm.detail)',
    ),
    W(
      'swm_maintain',
      'swm',
      (a) => {
        switch (a.action) {
          case 'reboot':
            return `swm maintain reboot ${req(a.mac as string | undefined, 'mac')}`;
          case 'reset':
            return `swm maintain reset ${req(a.mac as string | undefined, 'mac')}`;
          case 'show':
            return 'swm maintain show';
          default:
            throw new Error('invalid swm_maintain action');
        }
      },
      {
        action: z.enum(['reboot', 'reset', 'show']),
        mac: swmMac.optional(),
      },
      'Switch maintain (SDK cli.swm.maintain)',
    ),
    W(
      'swm_search',
      'swm',
      (a) => {
        switch (a.action) {
          case 'mac':
            return `swm search mac ${req(a.mac as string | undefined, 'mac')}`;
          case 'ip':
            return `swm search ip ${req(a.ip as string | undefined, 'ip')}`;
          case 'description':
            return `swm search description ${req(a.query as string | undefined, 'query')}`;
          default:
            throw new Error('invalid swm_search action');
        }
      },
      {
        action: z.enum(['mac', 'ip', 'description']),
        mac: swmMac.optional(),
        ip: ipv4.optional(),
        query: safeText().optional(),
      },
      'Switch search (SDK cli.swm.search)',
    ),
    W(
      'swm_db',
      'swm',
      (a) => {
        switch (a.action) {
          case 'ctlToggle':
            return `swm db ctl ${req(a.enabled as boolean | undefined, 'enabled') ? 'en' : 'dis'}`;
          case 'ctlShow':
            return 'swm db ctl show';
          case 'alertNotify':
            return `swm db alert notify ${req(a.mode as string | undefined, 'mode')}`;
          case 'alertAction':
            return `swm db alert action ${req(a.mode as string | undefined, 'mode')}`;
          case 'alertSms':
            return `swm db alert sms ${req(a.idx as number | undefined, 'idx')}`;
          case 'alertMail':
            return `swm db alert mail ${req(a.idx as number | undefined, 'idx')}`;
          default:
            throw new Error('invalid swm_db action');
        }
      },
      {
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
      'Switch DB (SDK cli.swm.db)',
    ),
    W(
      'swm_alert',
      'swm',
      (a) => {
        switch (a.action) {
          case 'toggle':
            return `swm alert ${req(a.enabled as boolean | undefined, 'enabled') ? 'enable' : 'disable'}`;
          case 'show':
            return 'swm alert show';
          case 'actionToggle':
            return `swm alert ${req(a.enabled as boolean | undefined, 'enabled') ? 'en' : 'dis'} ${req(a.idx as number | undefined, 'idx')}`;
          case 'setLog':
            return `swm alert set ${req(a.idx as number | undefined, 'idx')} log ${req(a.enabled as boolean | undefined, 'enabled') ? 'e' : 'd'}`;
          case 'setName':
            return `swm alert set ${req(a.idx as number | undefined, 'idx')} name ${req(a.name as string | undefined, 'name')}`;
          case 'setColor':
            return `swm alert set ${req(a.idx as number | undefined, 'idx')} color ${req(a.color as string | undefined, 'color')}`;
          case 'setNotif':
            return `swm alert set ${req(a.idx as number | undefined, 'idx')} notif ${req(a.enabled as boolean | undefined, 'enabled') ? 'e' : 'd'}`;
          case 'setObject':
            return `swm alert set ${req(a.idx as number | undefined, 'idx')} obj ${req(a.objectIndex as number | undefined, 'objectIndex')} ${req(a.objectValue as number | undefined, 'objectValue')}`;
          case 'display':
            return 'swm alert display';
          default:
            throw new Error('invalid swm_alert action');
        }
      },
      {
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
      'Switch alert (SDK cli.swm.alert canonical forms)',
    ),
    W(
      'swm_log',
      'swm',
      (a) => {
        switch (a.action) {
          case 'showFilter':
            return 'swm log show filter';
          case 'showDay':
            return 'swm log show day';
          case 'showWeek':
            return 'swm log show week';
          case 'setLevel':
            return `swm log set level ${req(a.idx as number | undefined, 'idx')} ${req(a.enabled as boolean | undefined, 'enabled') ? 'on' : 'off'}`;
          case 'setType':
            return `swm log set type ${req(a.idx as number | undefined, 'idx')} ${req(a.enabled as boolean | undefined, 'enabled') ? 'on' : 'off'}`;
          case 'setSwitch':
            return `swm log set switch ${req(a.mac as string | undefined, 'mac')} ${req(a.enabled as boolean | undefined, 'enabled') ? 'on' : 'off'}`;
          default:
            throw new Error('invalid swm_log action');
        }
      },
      {
        action: z.enum(['showFilter', 'showDay', 'showWeek', 'setLevel', 'setType', 'setSwitch']),
        idx: z.number().int().min(1).max(8).optional(),
        enabled: z.boolean().optional(),
        mac: swmMac.optional(),
      },
      'Switch log (SDK cli.swm.log)',
    ),
    W(
      'swm_snmp',
      'swm',
      (a) => {
        switch (a.action) {
          case 'sys':
            return `swm snmp sys ${req(a.mac as string | undefined, 'mac')}`;
          case 'iftbl':
            return `swm snmp iftbl ${req(a.mac as string | undefined, 'mac')} ${req(a.portNum as number | undefined, 'portNum')}`;
          case 'poe':
            return `swm snmp poe ${req(a.mac as string | undefined, 'mac')}`;
          case 'trpcomShow':
            return `swm snmp trpcom show ${req(a.mac as string | undefined, 'mac')}`;
          case 'trpcomSet':
            return `swm snmp trpcom set ${req(a.mac as string | undefined, 'mac')} ${req(a.name as string | undefined, 'name')}`;
          default:
            throw new Error('invalid swm_snmp action');
        }
      },
      {
        action: z.enum(['sys', 'iftbl', 'poe', 'trpcomShow', 'trpcomSet']),
        mac: swmMac.optional(),
        portNum: z.number().int().min(1).max(28).optional(),
        name: swmToken.optional(),
      },
      'Switch SNMP (SDK cli.swm.snmp)',
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
