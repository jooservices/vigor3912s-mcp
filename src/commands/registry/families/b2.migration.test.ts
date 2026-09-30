import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { srvFamily } from './srv.js';
import { ipFamily } from './ip.js';
import { mngtFamily } from './mngt.js';
import { ddnsFamily } from './ddns.js';
import { ipfFamily } from './ipf.js';
import type { CommandDef, FamilyDef } from '../types.js';

function find(family: FamilyDef, id: string): CommandDef {
  const cmd = family.commands.find((c) => c.id === id);
  if (!cmd) throw new Error(`test setup: command "${id}" not found in family "${family.family}"`);
  return cmd;
}

function argsAreValid(cmd: CommandDef, args: Record<string, unknown>): boolean {
  return z.object(cmd.args).safeParse(args).success;
}

describe('B2 migration: srv', () => {
  it('dhcp_status: unchanged, marked partial (bare only, omits interfaceLabel)', () => {
    const cmd = find(srvFamily, 'dhcp_status');
    expect(cmd.sdk?.manifestId).toBe('cli.srv.dhcp.status');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({})).toBe('srv dhcp status');
    expect(cmd.sdk!.validate!(cmd.sdk!.toInput!({}))).toEqual({});
  });

  it('nat_view: unchanged', () => {
    const cmd = find(srvFamily, 'nat_view');
    expect(cmd.sdk?.manifestId).toBe('cli.srv.nat.view');
    expect(cmd.render({})).toBe('srv nat view');
  });

  it('dhcp_on / dhcp_off: unchanged', () => {
    expect(find(srvFamily, 'dhcp_on').render({})).toBe('srv dhcp on');
    expect(find(srvFamily, 'dhcp_off').render({})).toBe('srv dhcp off');
  });

  it('dhcp_startip: DIVERGENCE resolved — no LAN/count in the real syntax, lan/count now ignored', () => {
    const cmd = find(srvFamily, 'dhcp_startip');
    expect(cmd.sdk?.manifestId).toBe('cli.srv.dhcp.startip');
    expect(cmd.render({ lan: 1, start: '192.168.1.53', count: 50 })).toBe('srv dhcp startip 192.168.1.53');
    expect(cmd.sdk!.toInput!({ lan: 1, start: '192.168.1.53', count: 50 })).toEqual({
      startIp: '192.168.1.53',
    });
  });

  it('dhcp_gateway: DIVERGENCE resolved — no LAN in the real syntax, lan now ignored', () => {
    const cmd = find(srvFamily, 'dhcp_gateway');
    expect(cmd.sdk?.manifestId).toBe('cli.srv.dhcp.gateway');
    expect(cmd.render({ lan: 2, gateway: '192.168.2.1' })).toBe('srv dhcp gateway 192.168.2.1');
  });

  it('dhcp_dns1 / dhcp_dns2: DIVERGENCE resolved — lowercase "lan<n>" token, not "LAN<n>"', () => {
    const dns1 = find(srvFamily, 'dhcp_dns1');
    expect(dns1.sdk?.manifestId).toBe('cli.srv.dhcp.dns1');
    expect(dns1.render({ lan: 8, dns: '168.95.1.1' })).toBe('srv dhcp dns1 lan8 168.95.1.1');

    const dns2 = find(srvFamily, 'dhcp_dns2');
    expect(dns2.sdk?.manifestId).toBe('cli.srv.dhcp.dns2');
    expect(dns2.render({ lan: 3, dns: '10.1.1.1' })).toBe('srv dhcp dns2 lan3 10.1.1.1');
  });

  it('dhcp_leasetime: DIVERGENCE resolved — no LAN in the real syntax, lan now ignored', () => {
    const cmd = find(srvFamily, 'dhcp_leasetime');
    expect(cmd.sdk?.manifestId).toBe('cli.srv.dhcp.leasetime');
    expect(cmd.render({ lan: 4, seconds: 259200 })).toBe('srv dhcp leasetime 259200');
  });

  it('nat_dmz: adopts the SDK action shape because the legacy form was undocumented', () => {
    const cmd = find(srvFamily, 'nat_dmz');
    expect(cmd.sdk?.manifestId).toBe('cli.srv.nat.dmz');
    expect(cmd.render({ action: 'setPrivateIp', wan: 1, index: 2, privateIp: '192.168.1.96' })).toBe(
      'srv nat dmz 1 2 -i 192.168.1.96',
    );
  });
});

describe('B2 migration: ip', () => {
  it('ip_route_status: unchanged', () => {
    const cmd = find(ipFamily, 'ip_route_status');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.route');
    expect(cmd.render({})).toBe('ip route status');
  });

  it('ip_arp_status: unchanged, marked partial (status only, omits acceptStatus)', () => {
    const cmd = find(ipFamily, 'ip_arp_status');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.arp');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({})).toBe('ip arp status');
  });

  it('ip_ping: unchanged, marked partial (omits wanInterface)', () => {
    const cmd = find(ipFamily, 'ip_ping');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.ping');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ host: '8.8.8.8' })).toBe('ip ping 8.8.8.8');
    expect(argsAreValid(cmd, { host: 'not-an-ip' })).toBe(false);
  });

  it('ip_tracert: unchanged, marked partial (omits wanInterface/protocol)', () => {
    const cmd = find(ipFamily, 'ip_tracert');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.tracert');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({ host: '1.1.1.1' })).toBe('ip tracert 1.1.1.1');
  });

  it('ip_session: uses the SDK status/show action union', () => {
    const cmd = find(ipFamily, 'ip_session');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.session');
    expect(cmd.render({ action: 'status' })).toBe('ip session status');
  });

  it('ip_dnsforward / ip_lanDNSRes: unchanged', () => {
    expect(find(ipFamily, 'ip_dnsforward').render({})).toBe('ip dnsforward');
    expect(find(ipFamily, 'ip_lanDNSRes').render({})).toBe('ip lanDNSRes');
  });

  it('ip_addr: DIVERGENCE resolved — no LAN selector in the real syntax, lan now ignored', () => {
    const cmd = find(ipFamily, 'ip_addr');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.addr');
    expect(cmd.render({ lan: 1, ip: '192.168.1.1' })).toBe('ip addr 192.168.1.1');
    expect(cmd.sdk!.toInput!({ lan: 1, ip: '192.168.1.1' })).toEqual({ ipv4Address: '192.168.1.1' });
  });

  it('ip_nmask: DIVERGENCE resolved — no LAN selector in the real syntax, lan now ignored', () => {
    const cmd = find(ipFamily, 'ip_nmask');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.nmask');
    expect(cmd.render({ lan: 1, mask: '255.255.255.0' })).toBe('ip nmask 255.255.255.0');
  });

  it('ip_route_add / ip_route_del: use the SDK route operations', () => {
    const add = find(ipFamily, 'ip_route_add');
    const del = find(ipFamily, 'ip_route_del');
    expect(add.sdk?.manifestId).toBe('cli.ip.route.add');
    expect(del.sdk?.manifestId).toBe('cli.ip.route.del');
    expect(add.render({ dst: '0.0.0.0', netmask: '0.0.0.0', gateway: '192.168.1.1', ifno: 3, rtype: 'static' })).toBe(
      'ip route add 0.0.0.0 0.0.0.0 192.168.1.1 3 static',
    );
  });

  it('ip_bindmac: adopts the SDK action union and required comment', () => {
    const cmd = find(ipFamily, 'ip_bindmac');
    expect(cmd.sdk?.manifestId).toBe('cli.ip.bindmac');
    expect(cmd.render({ action: 'add', ipv4Address: '192.168.1.1', mac: '00:11:22:33:44:55', comment: 'host' })).toBe(
      'ip bindmac add 192.168.1.1 00:11:22:33:44:55 host',
    );
  });
});

describe('B2 migration: mngt', () => {
  it('mngt_sshport / mngt_telnetport / mngt_httpport / mngt_httpsport: unchanged', () => {
    expect(find(mngtFamily, 'mngt_sshport').render({ port: 22 })).toBe('mngt sshport 22');
    expect(find(mngtFamily, 'mngt_telnetport').render({ port: 23 })).toBe('mngt telnetport 23');
    expect(find(mngtFamily, 'mngt_httpport').render({ port: 80 })).toBe('mngt httpport 80');
    expect(find(mngtFamily, 'mngt_httpsport').render({ port: 443 })).toBe('mngt httpsport 443');
    expect(argsAreValid(find(mngtFamily, 'mngt_sshport'), { port: 70000 })).toBe(false);
  });

  it('mngt_sshtimeout / mngt_telnettimeout: unchanged', () => {
    expect(find(mngtFamily, 'mngt_sshtimeout').render({ seconds: 120 })).toBe('mngt sshtimeout 120');
    expect(find(mngtFamily, 'mngt_telnettimeout').render({ seconds: 120 })).toBe('mngt telnettimeout 120');
  });

  it('mngt_noping: unchanged across all 4 actions', () => {
    const cmd = find(mngtFamily, 'mngt_noping');
    expect(cmd.sdk?.manifestId).toBe('cli.mngt.noping');
    for (const action of ['on', 'off', 'viewlog', 'clearlog']) {
      expect(cmd.render({ action })).toBe(`mngt noping ${action}`);
    }
  });

  it('mngt_defenseworm: unchanged, simple + add/del-with-port variants', () => {
    const cmd = find(mngtFamily, 'mngt_defenseworm');
    expect(cmd.sdk?.manifestId).toBe('cli.mngt.defenseworm');
    expect(cmd.render({ action: 'on' })).toBe('mngt defenseworm on');
    expect(cmd.render({ action: 'add', port: 8080 })).toBe('mngt defenseworm add 8080');
    expect(() => cmd.render({ action: 'del' })).toThrow(/port is required/);
  });

  it('mngt_bfp: unchanged, flags pass through', () => {
    const cmd = find(mngtFamily, 'mngt_bfp');
    expect(cmd.sdk?.manifestId).toBe('cli.mngt.bfp');
    expect(cmd.render({ args: ['-e', '1'] })).toBe('mngt bfp -e 1');
    expect(argsAreValid(cmd, { args: ['-x'] })).toBe(false);
  });
});

describe('B2 migration: ddns', () => {
  it('ddns_show: uses the SDK account-index argument', () => {
    const cmd = find(ddnsFamily, 'ddns_show');
    expect(cmd.sdk?.manifestId).toBe('cli.ddns.show');
    expect(cmd.render({ accountIndex: 1 })).toBe('ddns show -i 1');
  });

  it('ddns_log / ddns_forceupdate: unchanged', () => {
    expect(find(ddnsFamily, 'ddns_log').render({})).toBe('ddns log');
    expect(find(ddnsFamily, 'ddns_forceupdate').render({})).toBe('ddns forceupdate');
  });

  it('ddns_enable: DIVERGENCE resolved — numeric 0/1, not on/off text', () => {
    const cmd = find(ddnsFamily, 'ddns_enable');
    expect(cmd.sdk?.manifestId).toBe('cli.ddns.enable');
    expect(cmd.render({ onoff: 'on' })).toBe('ddns enable 1');
    expect(cmd.render({ onoff: 'off' })).toBe('ddns enable 0');
  });
});

describe('B2 migration: ipf', () => {
  it('ipf_view: unchanged, marked partial (bare only, omits flags)', () => {
    const cmd = find(ipfFamily, 'ipf_view');
    expect(cmd.sdk?.manifestId).toBe('cli.ipf.view');
    expect(cmd.sdk?.partial).toBe(true);
    expect(cmd.render({})).toBe('ipf view');
  });

  it('ipf_set: unchanged across all 6 actions', () => {
    const cmd = find(ipfFamily, 'ipf_set');
    expect(cmd.sdk?.manifestId).toBe('cli.ipf.set');
    expect(cmd.render({ action: 'callFilterSet', setNo: 3 })).toBe('ipf set -c 3');
    expect(cmd.render({ action: 'dataFilterSet', setNo: 4 })).toBe('ipf set -d 4');
    expect(cmd.render({ action: 'defaultAction', pass: true, logToSyslog: false })).toBe('ipf set -p 0 0');
    expect(cmd.render({ action: 'acceptRoutingFromWan', family: 'v4', enabled: true })).toBe(
      'ipf set -R v4 0',
    );
    expect(cmd.render({ action: 'strictSecurityFirewall', enabled: true })).toBe('ipf set -L 1');
    expect(cmd.render({ action: 'codePage', page: 5 })).toBe('ipf set -C 5');
  });

  it('ipf_rule: unchanged across view/enable/direction', () => {
    const cmd = find(ipfFamily, 'ipf_rule');
    expect(cmd.sdk?.manifestId).toBe('cli.ipf.rule');
    expect(cmd.render({ setNo: 1, ruleNo: 2, action: 'view' })).toBe('ipf rule 1 2 -v');
    expect(cmd.render({ setNo: 1, ruleNo: 2, action: 'enable', enabled: true })).toBe('ipf rule 1 2 -e 1');
    expect(cmd.render({ setNo: 1, ruleNo: 2, action: 'direction', direction: 2 })).toBe('ipf rule 1 2 -D 2');
  });

  it('ipf_flowtrack_view / ipf_flowtrack_set: unchanged', () => {
    expect(find(ipfFamily, 'ipf_flowtrack_view').render({ mode: 'sessions' })).toBe('ipf flowtrack view -f');
    expect(find(ipfFamily, 'ipf_flowtrack_view').render({ mode: 'all' })).toBe('ipf flowtrack view -b');
    expect(find(ipfFamily, 'ipf_flowtrack_set').render({ action: 'refresh' })).toBe('ipf flowtrack set -r');
    expect(find(ipfFamily, 'ipf_flowtrack_set').render({ action: 'enable' })).toBe('ipf flowtrack set -e');
  });
});
