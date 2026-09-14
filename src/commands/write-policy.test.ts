import { describe, expect, it } from 'vitest';
import { findCommand, writeCommands } from './registry/index.js';
import { WRITE_POLICY } from './write-policy.js';

describe('WRITE_POLICY', () => {
  it('only references write tools that exist in the registry', () => {
    const ids = new Set(writeCommands().map((c) => c.id));
    for (const id of Object.keys(WRITE_POLICY)) {
      expect(ids.has(id), `unknown write tool in WRITE_POLICY: ${id}`).toBe(true);
    }
  });

  it('merges policy onto findCommand / writeCommands', () => {
    const passwd = findCommand('sys_passwd');
    expect(passwd?.dangerous).toBe(true);
    expect(passwd?.secretArgs).toEqual(['old', 'new']);

    const ipAddr = findCommand('ip_addr');
    expect(ipAddr?.dangerous).toBe(true);
    expect(ipAddr?.snapshotRead).toBe('show_lan');
    expect(ipAddr?.affectsNetwork).toBe(true);

    const commit = findCommand('sys_commit');
    expect(commit?.skipCommit).toBe(true);
    expect(commit?.dangerous).toBeUndefined();
  });

  it('keeps prior dangerous tools and adds lockout-critical ones', () => {
    const mustBeDangerous = [
      'sys_passwd',
      'sys_reboot',
      'wan_enable',
      'wan_disable',
      'dhcp_on',
      'dhcp_off',
      'mngt_sshport',
      'internet_set',
      // supplements
      'ip_addr',
      'ip_nmask',
      'vlan_off',
      'mngt_httpport',
      'ipf_rule',
      'user_account',
    ];
    for (const id of mustBeDangerous) {
      expect(findCommand(id)?.dangerous, id).toBe(true);
    }
  });

  it('redacts free-form credential params via secretArgs', () => {
    expect(findCommand('user_account')?.secretArgs).toEqual(['param']);
    expect(findCommand('ldap_set')?.secretArgs).toEqual(['param']);
    expect(findCommand('vpn_setup')?.secretArgs).toEqual(['param']);
  });

  it('points snapshotRead at existing read tools', () => {
    for (const [id, policy] of Object.entries(WRITE_POLICY)) {
      if (!policy.snapshotRead) continue;
      const snap = findCommand(policy.snapshotRead);
      expect(snap?.kind, `${id} -> ${policy.snapshotRead}`).toBe('read');
    }
  });
});
