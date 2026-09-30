import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { internetFamily } from './internet.js';
import { linuxFamily } from './linux.js';
import { portFamily } from './port.js';
import { sysFamily } from './sys.js';
import { wanFamily } from './wan.js';
import type { CommandDef, FamilyDef } from '../types.js';

function find(family: FamilyDef, id: string): CommandDef {
  const cmd = family.commands.find((c) => c.id === id);
  if (!cmd) throw new Error(`test setup: command "${id}" not found in family "${family.family}"`);
  return cmd;
}

function argsAreValid(cmd: CommandDef, args: Record<string, unknown>): boolean {
  return z.object(cmd.args).safeParse(args).success;
}

describe('B1 migration: sys', () => {
  it.each([
    ['sys_version', 'cli.sys.version', {}, 'sys version'],
    ['sys_cmdlog', 'cli.sys.cmdlog', {}, 'sys cmdlog'],
    ['sys_cc', 'cli.sys.cc', {}, 'sys cc'],
    ['sys_qrybuf', 'cli.sys.qrybuf', {}, 'sys qrybuf'],
    ['sys_pollbuf', 'cli.sys.pollbuf', {}, 'sys pollbuf'],
    ['sys_info', 'cli.sys.info', {}, 'sys info'],
    ['sys_fr_log', 'cli.sys.frlog', {}, 'sys fr_log'],
    ['sys_max_session', 'cli.sys.maxsession', {}, 'sys max_session'],
    ['sys_app_statistic', 'cli.sys.appstatistic', {}, 'sys app_statistic'],
    ['sys_app_bandwidth', 'cli.sys.appbandwidth', {}, 'sys app_bandwidth'],
    ['sys_time', 'cli.sys.time', {}, 'sys time'],
    ['sys_dnsCacheTbl', 'cli.sys.dnscachetbl', {}, 'sys dnsCacheTbl'],
    ['sys_dashboard', 'cli.sys.dashboard', {}, 'sys dashboard'],
    ['sys_commit', 'cli.sys.commit', {}, 'sys commit'],
    ['sys_reboot', 'cli.sys.reboot', {}, 'sys reboot'],
    ['sys_tftpd', 'cli.sys.tftpd', {}, 'sys tftpd'],
  ] as const)('%s → %s renders unchanged for %j', (id, manifestId, args, expected) => {
    const cmd = find(sysFamily, id);
    expect(cmd.sdk?.manifestId).toBe(manifestId);
    expect(cmd.render(args)).toBe(expected);
    const mapped = cmd.sdk!.toInput!(args as Record<string, unknown>);
    expect(cmd.sdk!.validate!(mapped)).toBeUndefined();
  });

  it('sys_health: renders per metric and validates', () => {
    const cmd = find(sysFamily, 'sys_health');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.health');
    for (const metric of ['cpu_usage', 'mem_usage', 'view', 'voip_status']) {
      expect(cmd.render({ metric })).toBe(`sys health ${metric}`);
      const mapped = cmd.sdk!.toInput!({ metric });
      expect(cmd.sdk!.validate!(mapped)).toEqual({ metric });
    }
    expect(argsAreValid(cmd, { metric: 'bogus' })).toBe(false);
  });

  it('sys_passwd: maps old/new → oldPassword/newPassword', () => {
    const cmd = find(sysFamily, 'sys_passwd');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.passwd');
    expect(cmd.render({ old: 'oldpw', new: 'newpw' })).toBe('sys passwd oldpw newpw');
    expect(cmd.sdk!.toInput!({ old: 'oldpw', new: 'newpw' })).toEqual({
      oldPassword: 'oldpw',
      newPassword: 'newpw',
    });
  });

  it('sys_name: maps wan/name → wan/value', () => {
    const cmd = find(sysFamily, 'sys_name');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.name');
    expect(cmd.render({ wan: 'wan1', name: 'myname' })).toBe('sys name wan1 myname');
    expect(argsAreValid(cmd, { wan: 'wan3', name: 'x' })).toBe(false);
  });

  it('sys_domainname: maps wan/domain → wan/value', () => {
    const cmd = find(sysFamily, 'sys_domainname');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.domainname');
    expect(cmd.render({ wan: 'wan2', domain: 'example.com' })).toBe('sys domainname wan2 example.com');
  });

  it('sys_autoreboot: mode=off / mode=hours, marked partial (excludes SDK "on" variant)', () => {
    const cmd = find(sysFamily, 'sys_autoreboot');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.autoreboot');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ mode: 'off' })).toBe('sys autoreboot off');
    expect(cmd.render({ mode: 'hours', hours: 12 })).toBe('sys autoreboot 12');
    expect(() => cmd.render({ mode: 'hours' })).toThrow(/hours is required/);
  });

  it('sys_syslog: -a 0|1 args pass through', () => {
    const cmd = find(sysFamily, 'sys_syslog');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.syslog');
    expect(cmd.render({ args: ['-a', '1'] })).toBe('sys syslog -a 1');
    expect(argsAreValid(cmd, { args: ['bad'] })).toBe(false);
  });

  it('sys_mailalert: empty args → bare command; args → joined', () => {
    const cmd = find(sysFamily, 'sys_mailalert');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.mailalert');
    expect(cmd.render({})).toBe('sys mailalert');
    expect(cmd.render({ args: ['-e', '1'] })).toBe('sys mailalert -e 1');
  });

  it('sys_webhook: subcommand args pass through', () => {
    const cmd = find(sysFamily, 'sys_webhook');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.webhook');
    expect(cmd.render({ args: ['enable'] })).toBe('sys webhook enable');
    expect(argsAreValid(cmd, { args: ['bogus'] })).toBe(false);
  });

  it('sys_tr069: subcommand args pass through', () => {
    const cmd = find(sysFamily, 'sys_tr069');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.tr069');
    expect(cmd.render({ args: ['get'] })).toBe('sys tr069 get');
    expect(argsAreValid(cmd, { args: ['bogus'] })).toBe(false);
  });

  it('sys_alg: enabled 0|1 → boolean', () => {
    const cmd = find(sysFamily, 'sys_alg');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.alg');
    expect(cmd.render({ enabled: 1 })).toBe('sys alg -e 1');
    expect(cmd.render({ enabled: 0 })).toBe('sys alg -e 0');
    expect(argsAreValid(cmd, { enabled: 2 })).toBe(false);
  });

  it('sys_license: subcommand args pass through', () => {
    const cmd = find(sysFamily, 'sys_license');
    expect(cmd.sdk?.manifestId).toBe('cli.sys.license');
    expect(cmd.render({ args: ['liclog'] })).toBe('sys license liclog');
    expect(argsAreValid(cmd, { args: ['bogus'] })).toBe(false);
  });
});

describe('B1 migration: wan', () => {
  it('wan_status: unchanged', () => {
    const cmd = find(wanFamily, 'wan_status');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.status');
    expect(cmd.render({})).toBe('wan status');
  });

  it('wan_detect: DIVERGENCE resolved — now renders the documented "wan detect status" query', () => {
    const cmd = find(wanFamily, 'wan_detect');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.detect');
    expect(cmd.render({})).toBe('wan detect status');
  });

  it('wan_detect_mtu: DIVERGENCE resolved — now requires the documented probe params', () => {
    const cmd = find(wanFamily, 'wan_detect_mtu');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.detectmtu');
    const args = { host: '8.8.8.8', mtuSize: 1500, decreaseSize: 30, wanInterface: 1, count: 10 };
    expect(cmd.render(args)).toBe('wan detect_mtu -i 8.8.8.8 -s 1500 -d 30 -w 1 -c 10');
  });

  it('wan_detect_mtu6: DIVERGENCE resolved — now requires the documented probe params', () => {
    const cmd = find(wanFamily, 'wan_detect_mtu6');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.detectmtu6');
    const args = { host: '2404:6800:4008:c06::5e', mtuSize: 1500, wanInterface: 2 };
    expect(cmd.render(args)).toBe('wan detect_mtu6 -i 2404:6800:4008:c06::5e -s 1500 -w 2');
  });

  it('wan_enable / wan_disable: wan → wanInterface', () => {
    const enable = find(wanFamily, 'wan_enable');
    expect(enable.sdk?.manifestId).toBe('cli.wan.enable');
    expect(enable.render({ wan: 3 })).toBe('wan enable WAN3');

    const disable = find(wanFamily, 'wan_disable');
    expect(disable.sdk?.manifestId).toBe('cli.wan.disable');
    expect(disable.render({ wan: 3 })).toBe('wan disable WAN3');
  });

  it('wan_mtu: DIVERGENCE resolved — global "wan mtu"/"wan mtu2 <value>", no per-WAN form', () => {
    const cmd = find(wanFamily, 'wan_mtu');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.mtu.mtu2');
    expect(cmd.render({ target: 'mtu', value: 1100 })).toBe('wan mtu 1100');
    expect(cmd.render({ target: 'mtu2', value: 1400 })).toBe('wan mtu2 1400');
  });

  it('wan_dns: DIVERGENCE resolved — one selector (pri/sec) + one address', () => {
    const cmd = find(wanFamily, 'wan_dns');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.dns');
    expect(cmd.render({ wanNo: 1, dnsSelect: 'pri', ipv4Address: '168.95.1.1' })).toBe(
      'wan dns 1 pri 168.95.1.1',
    );
  });

  it('wan_forward: onoff → state', () => {
    const cmd = find(wanFamily, 'wan_forward');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.forward');
    expect(cmd.render({ onoff: 'on' })).toBe('wan forward on');
  });

  it('wan_failover: off / show / on variants unchanged', () => {
    const cmd = find(wanFamily, 'wan_failover');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.failover');
    expect(cmd.render({ action: 'off', index: 2 })).toBe('wan failover off 2');
    expect(cmd.render({ action: 'show', index: 2 })).toBe('wan failover show 2');
    expect(
      cmd.render({
        action: 'on',
        failoverWan: 1,
        disconnectActionEnabled: true,
        anyOrAllActionEnabled: false,
        mainWan: 2,
        downloadThresholdKbps: 1000,
        uploadThresholdKbps: 500,
      }),
    ).toBe('wan failover on 1 1 0 2 1000 500');
  });

  it('wan_lb: unchanged', () => {
    const cmd = find(wanFamily, 'wan_lb');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.lb');
    expect(cmd.render({ wanInterface: 'wan1', state: 'on' })).toBe('wan lb wan1 on');
  });

  it('wan_budget: wan → wanInterface across all three actions', () => {
    const cmd = find(wanFamily, 'wan_budget');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.budget');
    expect(cmd.render({ wan: 1, action: 'state', enabled: true })).toBe('wan budget wan 1 enable');
    expect(cmd.render({ wan: 1, action: 'thresholdMb', limitMb: 500 })).toBe('wan budget wan 1 thres 500');
    expect(cmd.render({ wan: 1, action: 'thresholdGb', limitGb: 5 })).toBe('wan budget wan 1 gthres 5');
  });

  it('wan_vlan: wan → wanInterface across all three actions', () => {
    const cmd = find(wanFamily, 'wan_vlan');
    expect(cmd.sdk?.manifestId).toBe('cli.wan.vlan');
    expect(cmd.render({ wan: 1, action: 'tag', tagValue: 10 })).toBe('wan vlan wan 1 tag 10');
    expect(cmd.render({ wan: 1, action: 'state', enabled: true })).toBe('wan vlan wan 1 enable');
    expect(cmd.render({ wan: 1, action: 'priority', priority: 5 })).toBe('wan vlan wan 1 pri 5');
  });
});

describe('B1 migration: linux', () => {
  it('linux_status: unchanged', () => {
    const cmd = find(linuxFamily, 'linux_status');
    expect(cmd.sdk?.manifestId).toBe('cli.linux.status');
    expect(cmd.render({})).toBe('linux status');
  });

  it('linux_ssh_enable / linux_ssh_disable: unchanged', () => {
    expect(find(linuxFamily, 'linux_ssh_enable').render({})).toBe('linux service ssh enable');
    expect(find(linuxFamily, 'linux_ssh_disable').render({})).toBe('linux service ssh disable');
  });

  it('linux_ssh_port: unchanged', () => {
    const cmd = find(linuxFamily, 'linux_ssh_port');
    expect(cmd.sdk?.manifestId).toBe('cli.linux.service.ssh.setport');
    expect(cmd.render({ port: 2222 })).toBe('linux service ssh setport 2222');
    expect(argsAreValid(cmd, { port: 70000 })).toBe(false);
  });

  it('linux_setlinuxip: unchanged, marked partial (omits vlan/password)', () => {
    const cmd = find(linuxFamily, 'linux_setlinuxip');
    expect(cmd.sdk?.manifestId).toBe('cli.linux.setlinuxip');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ ip: '10.0.0.1', cidr: 24, gateway: '10.0.0.254' })).toBe(
      'linux setlinuxip -i 10.0.0.1 -c 24 -g 10.0.0.254',
    );
  });
});

describe('B1 migration: port', () => {
  it('port_status / port_sniff_status: unchanged', () => {
    expect(find(portFamily, 'port_status').render({})).toBe('port status');
    expect(find(portFamily, 'port_sniff_status').render({})).toBe('port sniff status');
  });

  it('port_speed: unchanged, marked partial (LAN kind only, no WAN kind)', () => {
    const cmd = find(portFamily, 'port_speed');
    expect(cmd.sdk?.manifestId).toBe('cli.port');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ port: '3', speed: 'AN' })).toBe('port 3 AN');
    expect(cmd.render({ port: 'all', speed: '100F' })).toBe('port all 100F');
  });
});

describe('B1 migration: internet', () => {
  it('internet_view: unchanged', () => {
    const cmd = find(internetFamily, 'internet_view');
    expect(cmd.sdk?.manifestId).toBe('cli.internet.v');
    expect(cmd.render({})).toBe('internet -V');
  });

  it('internet_set: unchanged, marked partial (omits -P/-a/-i/-w/-n/-g/-s/-A/-B)', () => {
    const cmd = find(internetFamily, 'internet_set');
    expect(cmd.sdk?.manifestId).toBe('cli.internet');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ wan: 1, mode: 0 })).toBe('internet -W 1 -M 0');
    expect(cmd.render({ wan: 1, mode: 0, ispName: 'MyISP', username: 'u', password: 'p' })).toBe(
      'internet -W 1 -M 0 -S MyISP -u u -p p',
    );
  });
});
