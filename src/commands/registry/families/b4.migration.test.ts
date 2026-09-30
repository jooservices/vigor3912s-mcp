import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ip6Family } from './ip6.js';
import { ldapFamily } from './ldap.js';
import { msubnetFamily } from './msubnet.js';
import { portmaptimeFamily } from './portmaptime.js';
import { swmFamily } from './swm.js';
import { tacacsplusFamily } from './tacacsplus.js';
import type { CommandDef, FamilyDef } from '../types.js';

function find(family: FamilyDef, id: string): CommandDef {
  const cmd = family.commands.find((c) => c.id === id);
  if (!cmd) throw new Error(`test setup: command "${id}" not found in family "${family.family}"`);
  return cmd;
}

function argsAreValid(cmd: CommandDef, args: Record<string, unknown>): boolean {
  return z.object(cmd.args).safeParse(args).success;
}

describe('B4 migration: msubnet', () => {
  it('msubnet_status: adopts the required LAN index', () => {
    const cmd = find(msubnetFamily, 'msubnet_status');
    expect(cmd.sdk?.manifestId).toBe('cli.msubnet.status');
    expect(cmd.render({ lanIndex: 2 })).toBe('msubnet status 2');
  });

  it('msubnet_switch: adopts the LAN index and boolean state', () => {
    const cmd = find(msubnetFamily, 'msubnet_switch');
    expect(cmd.sdk?.manifestId).toBe('cli.msubnet.switch');
    expect(cmd.render({ lanIndex: 2, enabled: true })).toBe('msubnet switch 2 On');
  });
});

describe('B4 migration: ip6', () => {
  it('ip6_ping: host → target, marked partial (omits interfaceLabel/sendCount/dataSize)', () => {
    const cmd = find(ip6Family, 'ip6_ping');
    expect(cmd.sdk?.manifestId).toBe('cli.ip6.ping');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ host: '2001:db8::1' })).toBe('ip6 ping 2001:db8::1');
    const mapped = cmd.sdk!.toInput!({ host: '2001:db8::1' });
    expect(cmd.sdk!.validate!(mapped)).toEqual({ target: '2001:db8::1' });
  });

  it('ip6_tracert: host → target, marked partial (omits interfaceLabel)', () => {
    const cmd = find(ip6Family, 'ip6_tracert');
    expect(cmd.sdk?.manifestId).toBe('cli.ip6.tracert');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ host: '2001:db8::2' })).toBe('ip6 tracert 2001:db8::2');
  });

  it('ip6_addr: uses the SDK discriminated union', () => {
    const cmd = find(ip6Family, 'ip6_addr');
    expect(cmd.sdk?.manifestId).toBe('cli.ip6.addr');
    expect(cmd.render({ action: 'set', prefix: '2001:db8::', prefixLength: 64, interfaceLabel: 'LAN1' })).toBe(
      'ip6 addr -s 2001:db8:: 64 LAN1',
    );
  });

  it('ip6_mngt: proto/onoff → service/enabled, marked partial (omits list/status actions + internet/enforce_https)', () => {
    const cmd = find(ip6Family, 'ip6_mngt');
    expect(cmd.sdk?.manifestId).toBe('cli.ip6.mngt');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ proto: 'http', onoff: 'on' })).toBe('ip6 mngt http on');
    expect(cmd.render({ proto: 'ssh', onoff: 'off' })).toBe('ip6 mngt ssh off');
    const mapped = cmd.sdk!.toInput!({ proto: 'https', onoff: 'on' });
    expect(mapped).toEqual({ action: 'service', service: 'https', enabled: true });
    expect(cmd.sdk!.validate!(mapped)).toEqual(mapped);
  });
});

describe('B4 migration: ldap', () => {
  it('ldap_view: unchanged', () => {
    const cmd = find(ldapFamily, 'ldap_view');
    expect(cmd.sdk?.manifestId).toBe('cli.ldap.view');
    expect(cmd.render({})).toBe('ldap view');
  });

  it('ldap_set: enable/type/ssl/dn unchanged', () => {
    const cmd = find(ldapFamily, 'ldap_set');
    expect(cmd.sdk?.manifestId).toBe('cli.ldap.set');
    expect(cmd.render({ option: 'enable', enabled: true })).toBe('ldap set enable 1');
    expect(cmd.render({ option: 'enable', enabled: false })).toBe('ldap set enable 0');
    expect(cmd.render({ option: 'type', bindType: 2 })).toBe('ldap set type 2');
    expect(cmd.render({ option: 'ssl', enabled: true })).toBe('ldap set ssl 1');
    expect(cmd.render({ option: 'dn', value: 'dc=example,dc=com' })).toBe(
      'ldap set dn dc=example,dc=com',
    );
  });

  it('ldap_set: DIVERGENCE resolved — ip/password now render uppercase IP/PWD per CLI reference', () => {
    const cmd = find(ldapFamily, 'ldap_set');
    expect(cmd.render({ option: 'ip', ipAddress: '192.168.100.155' })).toBe(
      'ldap set IP 192.168.100.155',
    );
    expect(cmd.render({ option: 'password', value: '123456' })).toBe('ldap set PWD 123456');
  });

  it('ldap_set: port unchanged; missing required value throws', () => {
    const cmd = find(ldapFamily, 'ldap_set');
    expect(cmd.render({ option: 'port', port: 389 })).toBe('ldap set port 389');
    expect(() => cmd.render({ option: 'enable' })).toThrow(/enabled is required/);
  });

  it('ldap_user: name/baseDn/filter/groupDn/commonName/view unchanged', () => {
    const cmd = find(ldapFamily, 'ldap_user');
    expect(cmd.sdk?.manifestId).toBe('cli.ldap.user');
    expect(cmd.render({ index: 1, action: 'name', value: 'cn' })).toBe('ldap user 1 -n cn');
    expect(cmd.render({ index: 1, action: 'baseDn', value: 'dc=x' })).toBe('ldap user 1 -b dc=x');
    expect(cmd.render({ index: 1, action: 'filter', value: 'f' })).toBe('ldap user 1 -a f');
    expect(cmd.render({ index: 1, action: 'groupDn', value: 'g' })).toBe('ldap user 1 -g g');
    expect(cmd.render({ index: 1, action: 'commonName', value: 'c' })).toBe('ldap user 1 -c c');
    expect(cmd.render({ index: 1, action: 'view' })).toBe('ldap user 1 -v');
  });
});

describe('B4 migration: tacacsplus', () => {
  it('tacacsplus_view: unchanged', () => {
    const cmd = find(tacacsplusFamily, 'tacacsplus_view');
    expect(cmd.sdk?.manifestId).toBe('cli.tacacsplus.view');
    expect(cmd.render({})).toBe('tacacsplus view');
  });

  it('tacacsplus_set: all actions unchanged', () => {
    const cmd = find(tacacsplusFamily, 'tacacsplus_set');
    expect(cmd.sdk?.manifestId).toBe('cli.tacacsplus.set');
    expect(cmd.render({ action: 'enable', enabled: true })).toBe('tacacsplus set -e 1');
    expect(cmd.render({ action: 'serverIp', serverIndex: 0, ipAddress: '10.0.0.1' })).toBe(
      'tacacsplus set -i "0 10.0.0.1"',
    );
    expect(cmd.render({ action: 'serverPort', serverIndex: 1, port: 49 })).toBe(
      'tacacsplus set -p "1 49"',
    );
    expect(cmd.render({ action: 'sharedSecret', serverIndex: 0, secret: 's3cret' })).toBe(
      'tacacsplus set -s "0 s3cret"',
    );
    expect(cmd.render({ action: 'clear' })).toBe('tacacsplus set -C yes');
  });

  it('tacacsplus_set: rejects a quote in the shared secret (legacy arg validation)', () => {
    const cmd = find(tacacsplusFamily, 'tacacsplus_set');
    expect(
      argsAreValid(cmd, { action: 'sharedSecret', serverIndex: 0, secret: 'a"b' }),
    ).toBe(false);
  });
});

describe('B4 migration: portmaptime', () => {
  it('portmaptime_list / portmaptime_flush: unchanged', () => {
    expect(find(portmaptimeFamily, 'portmaptime_list').render({})).toBe('portmaptime -l');
    expect(find(portmaptimeFamily, 'portmaptime_flush').render({})).toBe('portmaptime -f');
  });

  it('portmaptime_set: unchanged, marked partial (omits combining multiple flags at once)', () => {
    const cmd = find(portmaptimeFamily, 'portmaptime_set');
    expect(cmd.sdk?.manifestId).toBe('cli.portmaptime');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ proto: 't', seconds: 300 })).toBe('portmaptime -t 300');
    expect(cmd.render({ proto: 'u', seconds: 60 })).toBe('portmaptime -u 60');
    expect(cmd.render({ proto: 'i', seconds: 10 })).toBe('portmaptime -i 10');
    expect(cmd.render({ proto: 'w', seconds: 20 })).toBe('portmaptime -w 20');
    expect(cmd.render({ proto: 's', seconds: 30 })).toBe('portmaptime -s 30');
  });
});

describe('B4 migration: swm', () => {
  it('swm_show / swm_get: use their required SDK arguments', () => {
    expect(find(swmFamily, 'swm_show').sdk?.manifestId).toBe('cli.swm.show');
    expect(find(swmFamily, 'swm_show').render({ lanPort: 1 })).toBe('swm show 1');
    expect(find(swmFamily, 'swm_get').sdk?.manifestId).toBe('cli.swm.get');
    expect(find(swmFamily, 'swm_get').render({ mac: '001122334455' })).toBe('swm get 001122334455');
  });

  it('swm_enable / swm_disable: unchanged, marked partial (share cli.swm.enable.disable)', () => {
    const enable = find(swmFamily, 'swm_enable');
    expect(enable.sdk?.manifestId).toBe('cli.swm.enable.disable');
    expect(enable.sdk?.partial).toBe(true);
    expect(enable.render({})).toBe('swm enable');

    const disable = find(swmFamily, 'swm_disable');
    expect(disable.sdk?.manifestId).toBe('cli.swm.enable.disable');
    expect(disable.sdk?.partial).toBe(true);
    expect(disable.render({})).toBe('swm disable');
  });

  it('swm_post: unchanged', () => {
    const cmd = find(swmFamily, 'swm_post');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.post');
    expect(cmd.render({ mac: '001122334455' })).toBe('swm post 001122334455');
  });

  it('swm_group: all 5 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_group');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.group');
    expect(
      cmd.render({ action: 'setWithPassword', idx: 1, name: 'g1', password: 'pw' }),
    ).toBe('swm group set 1 g1 1 pw');
    expect(cmd.render({ action: 'setNoPassword', idx: 1, name: 'g1' })).toBe('swm group set 1 g1 0');
    expect(cmd.render({ action: 'show' })).toBe('swm group show');
    expect(cmd.render({ action: 'add', idx: 1, mac: '001122334455' })).toBe(
      'swm group add 1 001122334455',
    );
    expect(cmd.render({ action: 'delete', idx: 1, mac: '001122334455' })).toBe(
      'swm group delete 1 001122334455',
    );
  });

  it('swm_profile: all 5 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_profile');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.profile');
    expect(cmd.render({ action: 'add', mac: '001122334455' })).toBe('swm profile add 001122334455');
    expect(cmd.render({ action: 'delete', mac: '001122334455' })).toBe(
      'swm profile delete 001122334455',
    );
    expect(cmd.render({ action: 'show' })).toBe('swm profile show');
    expect(cmd.render({ action: 'enableAll', mac: '001122334455' })).toBe(
      'swm profile enable_all 001122334455',
    );
    expect(cmd.render({ action: 'disableAll', mac: '001122334455' })).toBe(
      'swm profile disable_all 001122334455',
    );
  });

  it('swm_detail: all 9 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_detail');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.detail');
    expect(cmd.render({ action: 'comment', mac: '001122334455', comment: 'hi' })).toBe(
      'swm detail comment 001122334455 hi',
    );
    expect(cmd.render({ action: 'name', mac: '001122334455', name: 'n1' })).toBe(
      'swm detail name 001122334455 n1',
    );
    expect(cmd.render({ action: 'passwd', mac: '001122334455', password: 'pw' })).toBe(
      'swm detail passwd 001122334455 pw',
    );
    expect(cmd.render({ action: 'config', mac: '001122334455', configIndex: 2 })).toBe(
      'swm detail config 001122334455 2',
    );
    expect(cmd.render({ action: 'show' })).toBe('swm detail show');
    expect(cmd.render({ action: 'portShow', mac: '001122334455' })).toBe(
      'swm detail port show 001122334455',
    );
    expect(
      cmd.render({
        action: 'port',
        mac: '001122334455',
        port: 3,
        flag: 'f1',
        schedule1: 1,
        schedule2: 2,
        description: 'd1',
      }),
    ).toBe('swm detail port 001122334455 3 f1 1 2 d1');
    expect(
      cmd.render({ action: 'rateToggle', mac: '001122334455', port: 3, direction: 'i', enabled: true }),
    ).toBe('swm detail rate 001122334455 3 i e');
    expect(
      cmd.render({ action: 'rateLimit', mac: '001122334455', port: 3, direction: 'e', limit: 100 }),
    ).toBe('swm detail rate 001122334455 3 e 100');
  });

  it('swm_maintain: all 3 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_maintain');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.maintain');
    expect(cmd.render({ action: 'reboot', mac: '001122334455' })).toBe(
      'swm maintain reboot 001122334455',
    );
    expect(cmd.render({ action: 'reset', mac: '001122334455' })).toBe(
      'swm maintain reset 001122334455',
    );
    expect(cmd.render({ action: 'show' })).toBe('swm maintain show');
  });

  it('swm_search: all 3 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_search');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.search');
    expect(cmd.render({ action: 'mac', mac: '001122334455' })).toBe('swm search mac 001122334455');
    expect(cmd.render({ action: 'ip', ip: '10.0.0.1' })).toBe('swm search ip 10.0.0.1');
    expect(cmd.render({ action: 'description', query: 'q' })).toBe('swm search description q');
  });

  it('swm_db: all 6 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_db');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.db');
    expect(cmd.render({ action: 'ctlToggle', enabled: true })).toBe('swm db ctl en');
    expect(cmd.render({ action: 'ctlToggle', enabled: false })).toBe('swm db ctl dis');
    expect(cmd.render({ action: 'ctlShow' })).toBe('swm db ctl show');
    expect(cmd.render({ action: 'alertNotify', mode: 'N' })).toBe('swm db alert notify N');
    expect(cmd.render({ action: 'alertAction', mode: 'B' })).toBe('swm db alert action B');
    expect(cmd.render({ action: 'alertSms', idx: 1 })).toBe('swm db alert sms 1');
    expect(cmd.render({ action: 'alertMail', idx: 1 })).toBe('swm db alert mail 1');
  });

  it('swm_alert: all 9 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_alert');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.alert');
    expect(cmd.render({ action: 'toggle', enabled: true })).toBe('swm alert enable');
    expect(cmd.render({ action: 'toggle', enabled: false })).toBe('swm alert disable');
    expect(cmd.render({ action: 'show' })).toBe('swm alert show');
    expect(cmd.render({ action: 'actionToggle', idx: 1, enabled: true })).toBe('swm alert en 1');
    expect(cmd.render({ action: 'setLog', idx: 1, enabled: true })).toBe('swm alert set 1 log e');
    expect(cmd.render({ action: 'setName', idx: 1, name: 'n1' })).toBe('swm alert set 1 name n1');
    expect(cmd.render({ action: 'setColor', idx: 2, color: 'O' })).toBe('swm alert set 2 color O');
    expect(cmd.render({ action: 'setNotif', idx: 3, enabled: true })).toBe('swm alert set 3 notif e');
    expect(cmd.render({ action: 'setObject', idx: 3, objectIndex: 1, objectValue: 2 })).toBe(
      'swm alert set 3 obj 1 2',
    );
    expect(cmd.render({ action: 'display' })).toBe('swm alert display');
  });

  it('swm_log: all 6 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_log');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.log');
    expect(cmd.render({ action: 'showFilter' })).toBe('swm log show filter');
    expect(cmd.render({ action: 'showDay' })).toBe('swm log show day');
    expect(cmd.render({ action: 'showWeek' })).toBe('swm log show week');
    expect(cmd.render({ action: 'setLevel', idx: 1, enabled: true })).toBe('swm log set level 1 on');
    expect(cmd.render({ action: 'setType', idx: 1, enabled: false })).toBe('swm log set type 1 off');
    expect(cmd.render({ action: 'setSwitch', mac: '001122334455', enabled: true })).toBe(
      'swm log set switch 001122334455 on',
    );
  });

  it('swm_snmp: all 5 actions unchanged', () => {
    const cmd = find(swmFamily, 'swm_snmp');
    expect(cmd.sdk?.manifestId).toBe('cli.swm.snmp');
    expect(cmd.render({ action: 'sys', mac: '001122334455' })).toBe('swm snmp sys 001122334455');
    expect(cmd.render({ action: 'iftbl', mac: '001122334455', portNum: 3 })).toBe(
      'swm snmp iftbl 001122334455 3',
    );
    expect(cmd.render({ action: 'poe', mac: '001122334455' })).toBe('swm snmp poe 001122334455');
    expect(cmd.render({ action: 'trpcomShow', mac: '001122334455' })).toBe(
      'swm snmp trpcom show 001122334455',
    );
    expect(cmd.render({ action: 'trpcomSet', mac: '001122334455', name: 'n1' })).toBe(
      'swm snmp trpcom set 001122334455 n1',
    );
  });

  it('swm_tr069: left raw — no SDK TypedOperation', () => {
    const cmd = find(swmFamily, 'swm_tr069');
    expect(cmd.sdk).toBeUndefined();
    expect(cmd.render({ args: ['get'] })).toBe('swm tr069 get');
  });
});
