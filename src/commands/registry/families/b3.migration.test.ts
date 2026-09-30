import { describe, expect, it } from 'vitest';
import { findCommand } from '../index.js';
import type { CommandDef } from '../types.js';

function migrated(id: string): CommandDef {
  const cmd = findCommand(id);
  if (!cmd) throw new Error(`command not found: ${id}`);
  if (!cmd.sdk) throw new Error(`command not migrated: ${id}`);
  return cmd;
}

function raw(id: string): CommandDef {
  const cmd = findCommand(id);
  if (!cmd) throw new Error(`command not found: ${id}`);
  return cmd;
}

describe('B3 migration: vpn', () => {
  it('vpn_list / vpn_remote / vpn_graph (bare reads)', () => {
    for (const [id, manifestId, expected] of [
      ['vpn_list', 'cli.vpn.list', 'vpn list'],
      ['vpn_remote', 'cli.vpn.remote', 'vpn remote'],
      ['vpn_graph', 'cli.vpn.graph', 'vpn graph'],
    ] as const) {
      const cmd = migrated(id);
      expect(cmd.sdk!.manifestId).toBe(manifestId);
      expect(cmd.render({})).toBe(expected);
    }
  });

  it('vpn_setup', () => {
    const cmd = migrated('vpn_setup');
    expect(cmd.render({ index: 1, param: 'mode 1' })).toBe('vpn setup 1 mode 1');
    expect(cmd.sdk!.validate!(cmd.sdk!.toInput!({ index: 1, param: 'mode 1' }))).toEqual({
      index: 1,
      param: 'mode 1',
    });
    expect(() => cmd.args.index!.parse(200)).toThrow();
  });

  it('vpn_ovpn / vpn_dial_out', () => {
    expect(migrated('vpn_ovpn').render({ param: 'show' })).toBe('vpn ovpn show');
    expect(migrated('vpn_dial_out').render({ param: 'dial 1' })).toBe('vpn dial_out dial 1');
  });
});

describe('B3 migration: qos', () => {
  it('qos_setup maps classIndex/ratioPercent to classRatio', () => {
    const cmd = migrated('qos_setup');
    expect(cmd.sdk!.manifestId).toBe('cli.qos.setup');
    expect(
      cmd.render({ mode: 3, inboundBandwidthKbps: 9500, outboundBandwidthKbps: 8500, classIndex: 3, ratioPercent: 20, udpBandwidthControlEnabled: true, udpBandwidthLimitRatioPercent: 50, outboundTcpAckPrioritizeEnabled: true }),
    ).toBe('qos setup -m 3 -i 9500 -o 8500 -r 3:20 -u 1 -p 50 -t 1');
    expect(() => cmd.render({})).toThrow();
  });

  it('qos_class add/edit/delete', () => {
    const cmd = migrated('qos_class');
    expect(cmd.render({ classIndex: 1, action: 'add', name: 'foo', ruleEnabled: true, localAddress: '1.2.3.4' })).toBe(
      'qos class -c 1 -n foo -a -m 1 -l 1.2.3.4',
    );
    expect(cmd.render({ classIndex: 1, action: 'edit', ruleIndex: 2, ruleEnabled: false })).toBe(
      'qos class -c 1 -e 2 -m 0',
    );
    expect(cmd.render({ classIndex: 1, action: 'delete', ruleIndex: 3 })).toBe('qos class -c 1 -d 3');
  });

  it('qos_type / qos_voip', () => {
    expect(
      migrated('qos_type').render({ action: 'add', name: 'foo', protocolType: 6, portRange: '80:80' }),
    ).toBe('qos type -a foo -t 6 -p 80:80');
    expect(migrated('qos_voip').render({ enabled: true })).toBe('qos voip on');
    expect(migrated('qos_voip').render({ enabled: false })).toBe('qos voip off');
  });
});

describe('B3 migration: ha', () => {
  it('ha_show / ha_status / ha_set', () => {
    expect(migrated('ha_show').render({ section: 'configSync' })).toBe('ha show -c');
    expect(migrated('ha_show').render({ section: 'generalSetup' })).toBe('ha show -g');
    expect(migrated('ha_status').render({ scope: 'allRouters', detailLevel: 2 })).toBe('ha status -a 2');
    expect(migrated('ha_set').render({ args: ['-e', '1'] })).toBe('ha set -e 1');
  });
});

describe('B3 migration: vrrp', () => {
  it('all vrrp tools', () => {
    expect(migrated('vrrp_show').render({})).toBe('vrrp show');
    expect(migrated('vrrp_enable').render({ onOff: 'on' })).toBe('vrrp enable on');
    expect(migrated('vrrp_set').render({ param: 'foo' })).toBe('vrrp set foo');
    expect(migrated('vrrp_apply').render({})).toBe('vrrp apply');
    expect(migrated('vrrp_reset').render({})).toBe('vrrp reset');
  });
});

describe('B3 migration: vigbrg', () => {
  it('vigbrg_status/wanstatus/wlanstatus', () => {
    expect(migrated('vigbrg_status').render({})).toBe('vigbrg status');
    expect(migrated('vigbrg_wanstatus').render({})).toBe('vigbrg wanstatus');
    expect(migrated('vigbrg_wlanstatus').render({})).toBe('vigbrg wlanstatus');
  });

  it('vigbrg_set maps oneZero to boolean', () => {
    const cmd = migrated('vigbrg_set');
    expect(cmd.render({ ipVersion: 4, wanIndex: 1, lanIndex: 1, bridgeEnabled: 1 })).toBe(
      'vigbrg set -v 4 -w 1 -l 1 -e 1',
    );
    expect(cmd.render({ ipVersion: 4, wanIndex: 1, lanIndex: 1, bridgeEnabled: 0, firewallEnabled: 1 })).toBe(
      'vigbrg set -v 4 -w 1 -l 1 -e 0 -f 1',
    );
  });
});

describe('B3 migration: vlan', () => {
  it('vlan_status/on/off', () => {
    expect(migrated('vlan_status').render({})).toBe('vlan status');
    expect(migrated('vlan_on').render({})).toBe('vlan on');
    expect(migrated('vlan_off').render({})).toBe('vlan off');
  });

  it('vlan_group', () => {
    const cmd = migrated('vlan_group');
    expect(cmd.render({ groupId: 3, action: 'set', ports: [1, 4] })).toBe('vlan group 3 set p1 p4');
    expect(cmd.render({ groupId: 3, action: 'show' })).toBe('vlan group 3 show');
    expect(() => cmd.render({ groupId: 3, action: 'set' })).toThrow();
  });
});

describe('B3 migration: apm', () => {
  it('apm_show / apm_query / apm_enable / apm_disable', () => {
    expect(migrated('apm_show').render({})).toBe('apm show');
    expect(migrated('apm_query').render({})).toBe('apm query');
    expect(migrated('apm_enable').render({})).toBe('apm enable');
    expect(migrated('apm_disable').render({})).toBe('apm disable');
  });

  it('apm_stanum: divergence fix — SDK correct, apIndex now required', () => {
    const cmd = migrated('apm_stanum');
    expect(cmd.sdk!.manifestId).toBe('cli.apm.stanum');
    expect(cmd.render({ apIndex: 1 })).toBe('apm stanum 1');
    expect(() => cmd.args.apIndex!.parse(0)).toThrow();
  });
});

describe('B3 migration: nand (partial, shared op)', () => {
  it('nand_usage and nand_bad pin one action each of the shared op', () => {
    const usage = migrated('nand_usage');
    const bad = migrated('nand_bad');
    expect(usage.sdk!.manifestId).toBe('cli.nand.bad.nand.usage');
    expect(bad.sdk!.manifestId).toBe('cli.nand.bad.nand.usage');
    expect(usage.sdk!.partial).toBe(true);
    expect(bad.sdk!.partial).toBe(true);
    expect(usage.render({})).toBe('nand usage');
    expect(bad.render({})).toBe('nand bad');
  });
});

describe('B3 migration: usb', () => {
  it('usb_devstat / usb_disk', () => {
    expect(migrated('usb_devstat').render({})).toBe('usb devstat');
    expect(migrated('usb_disk').render({})).toBe('usb disk');
  });

  it('usb_temp: divergence fix — SDK correct, action now required', () => {
    const cmd = migrated('usb_temp');
    expect(cmd.sdk!.manifestId).toBe('cli.usb.temp');
    expect(cmd.render({ action: 'show' })).toBe('usb temp show');
    expect(cmd.render({ action: 'allData' })).toBe('usb temp all_data');
    expect(() => cmd.args.action!.parse('bogus')).toThrow();
  });
});

describe('B3 migration: hsportal', () => {
  it('hsportal_info / hsportal_level', () => {
    expect(migrated('hsportal_info').render({})).toBe('hsportal info');
    expect(migrated('hsportal_level').render({})).toBe('hsportal level');
  });

  it('hsportal_setup all documented action variants', () => {
    const cmd = migrated('hsportal_setup');
    expect(cmd.render({ profile: 1, action: 'reset' })).toBe('hsportal setup -p 1 -c');
    expect(cmd.render({ profile: 1, action: 'enable' })).toBe('hsportal setup -p 1 -e');
    expect(cmd.render({ profile: 1, action: 'disable' })).toBe('hsportal setup -p 1 -d');
    expect(cmd.render({ profile: 1, action: 'landingPageMode', mode: 2 })).toBe(
      'hsportal setup -p 1 -r 2',
    );
    expect(cmd.render({ profile: 1, action: 'google', enabled: true, appKey: 'key1' })).toBe(
      'hsportal setup -p 1 -g 1 -k key1',
    );
    expect(cmd.render({ profile: 1, action: 'facebook', enabled: false, appId: 'app1' })).toBe(
      'hsportal setup -p 1 -f 0 -i app1',
    );
  });
});

describe('B3 migration: object', () => {
  it('object_ip_view / object_service_view: divergence fix — SDK correct, index now required', () => {
    const ip = migrated('object_ip_view');
    const svc = migrated('object_service_view');
    expect(ip.sdk!.manifestId).toBe('cli.object.ip.obj');
    expect(svc.sdk!.manifestId).toBe('cli.object.service.obj');
    expect(ip.render({ index: 1 })).toBe('object ip obj 1 -v');
    expect(svc.render({ index: 1 })).toBe('object service obj 1 -v');
  });
});

describe('B3 migration: local_8021x', () => {
  it('local8021x_show migrated; local8021x_show_local_cer stays raw (no SDK op)', () => {
    expect(migrated('local8021x_show').render({})).toBe('local_8021x show');
    const cer = raw('local8021x_show_local_cer');
    expect(cer.sdk).toBeUndefined();
    expect(cer.render({})).toBe('local_8021x show_local_cer');
  });
});

describe('B3 migration: user (partial, shared op)', () => {
  it('user_account / user_edit / user_set / user_setdefault pin one action each', () => {
    const account = migrated('user_account');
    const edit = migrated('user_edit');
    const set = migrated('user_set');
    const setdefault = migrated('user_setdefault');
    for (const cmd of [account, edit, set, setdefault]) {
      expect(cmd.sdk!.manifestId).toBe('cli.user');
      expect(cmd.sdk!.partial).toBe(true);
    }
    expect(account.render({ userName: 'bob', param: '-w newpass' })).toBe('user account bob -w newpass');
    expect(edit.render({ profileIdx: 2, param: '-n foo' })).toBe('user edit 2 -n foo');
    expect(set.render({ param: '-o' })).toBe('user set -o');
    expect(setdefault.render({})).toBe('user setdefault');
  });
});

describe('B3 migration: wol', () => {
  it('wol_send: divergence fix — SDK correct, render now includes "up"', () => {
    const cmd = migrated('wol_send');
    expect(cmd.sdk!.manifestId).toBe('cli.wol');
    expect(cmd.render({ mac: 'AA:BB:CC:DD:EE:FF' })).toBe('wol up AA:BB:CC:DD:EE:FF');
  });
});

describe('B3 migration: appqos', () => {
  it('appqos_view / appqos_enable', () => {
    expect(migrated('appqos_view').render({})).toBe('appqos view');
    const enable = migrated('appqos_enable');
    expect(enable.render({ mode: 1 })).toBe('appqos enable 1');
    expect(enable.render({ mode: 0 })).toBe('appqos enable 0');
  });
});

describe('B3 migration: service', () => {
  it('service_show: divergence fix — SDK correct, renders `-s`; service_get stays raw (no SDK op)', () => {
    const show = migrated('service_show');
    expect(show.sdk!.manifestId).toBe('cli.service');
    expect(show.render({})).toBe('service -s');
    const get = raw('service_get');
    expect(get.sdk).toBeUndefined();
    expect(get.render({})).toBe('service get');
  });
});

describe('B3 migration: csm', () => {
  it('csm_appe_show', () => {
    const cmd = migrated('csm_appe_show');
    expect(cmd.render({})).toBe('csm appe show');
    expect(cmd.render({ group: 'im' })).toBe('csm appe show -i');
  });

  it('csm_appe_set all action variants', () => {
    const cmd = migrated('csm_appe_set');
    expect(cmd.render({ index: 1, action: 'view', group: 'IM' })).toBe('csm appe set -i 1 -v IM');
    expect(cmd.render({ index: 1, action: 'enable', appIndex: 2 })).toBe('csm appe set -i 1 -e 2');
    expect(cmd.render({ index: 1, action: 'disable', appIndex: 2 })).toBe('csm appe set -i 1 -d 2');
    expect(cmd.render({ index: 1, action: 'enableRoute', appIndex: 2 })).toBe('csm appe set -i 1 -p 2');
    expect(cmd.render({ index: 1, action: 'disableRoute', appIndex: 2 })).toBe('csm appe set -i 1 -q 2');
  });

  it('csm_ucf all action variants', () => {
    const cmd = migrated('csm_ucf');
    expect(cmd.render({ action: 'show' })).toBe('csm ucf show');
    expect(cmd.render({ action: 'setdefault' })).toBe('csm ucf setdefault');
    expect(cmd.render({ action: 'message', message: 'hi' })).toBe('csm ucf msg hi');
    expect(cmd.render({ action: 'objName', index: 1, name: 'foo' })).toBe('csm ucf obj 1 -n foo');
    expect(cmd.render({ action: 'objPriority', index: 1, value: 2 })).toBe('csm ucf obj 1 -p 2');
    expect(cmd.render({ action: 'objLog', index: 1, logType: 'B' })).toBe('csm ucf obj 1 -l B');
  });

  it('csm_wcf all action variants', () => {
    const cmd = migrated('csm_wcf');
    expect(cmd.render({ action: 'show' })).toBe('csm wcf show');
    expect(cmd.render({ action: 'look' })).toBe('csm wcf look');
    expect(cmd.render({ action: 'cache' })).toBe('csm wcf cache');
    expect(cmd.render({ action: 'server', server: 'wcf.example.com' })).toBe(
      'csm wcf server wcf.example.com',
    );
    expect(cmd.render({ action: 'message', message: 'hi' })).toBe('csm wcf msg hi');
    expect(cmd.render({ action: 'setdefault' })).toBe('csm wcf setdefault');
    expect(cmd.render({ action: 'objView', index: 1 })).toBe('csm wcf obj 1 -v');
    expect(cmd.render({ action: 'objAction', index: 1, objAction: 'P' })).toBe('csm wcf obj 1 -a P');
    expect(cmd.render({ action: 'objName', index: 1, name: 'foo' })).toBe('csm wcf obj 1 -n foo');
    expect(cmd.render({ action: 'objLog', index: 1, logType: 'A' })).toBe('csm wcf obj 1 -l A');
  });

  it('csm_dnsf all action variants', () => {
    const cmd = migrated('csm_dnsf');
    expect(cmd.render({ action: 'enable', state: 'ON' })).toBe('csm dnsf enable ON');
    expect(cmd.render({ action: 'syslog', value: 'P' })).toBe('csm dnsf syslog P');
    expect(cmd.render({ action: 'wcf', index: 1 })).toBe('csm dnsf wcf 1');
    expect(cmd.render({ action: 'ucf', index: 1 })).toBe('csm dnsf ucf 1');
    expect(cmd.render({ action: 'cachetime', hours: 12 })).toBe('csm dnsf cachetime 12');
    expect(cmd.render({ action: 'blockpage', blockpage: 'on' })).toBe('csm dnsf blockpage on');
    expect(cmd.render({ action: 'profileShow' })).toBe('csm dnsf profile_show');
    expect(cmd.render({ action: 'profileEditName', index: 1, name: 'foo' })).toBe(
      'csm dnsf profile_edit 1 -n foo',
    );
    expect(cmd.render({ action: 'profileEditLog', index: 1, logType: 'B' })).toBe(
      'csm dnsf profile_edit 1 -l B',
    );
    expect(cmd.render({ action: 'profileSetdefault' })).toBe('csm dnsf profile_setdefault');
  });
});
