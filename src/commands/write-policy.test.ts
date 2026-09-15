import { describe, expect, it } from 'vitest';
import { findCommand, readCommands, writeCommands } from './registry/index.js';
import { WRITE_POLICY, resolveConfirmTier } from './write-policy.js';

describe('WRITE_POLICY / ConfirmTier', () => {
  it('only references write tools that exist in the registry', () => {
    const ids = new Set(writeCommands().map((c) => c.id));
    for (const id of Object.keys(WRITE_POLICY)) {
      expect(ids.has(id), `unknown write tool in WRITE_POLICY: ${id}`).toBe(true);
    }
  });

  it('resolves reads to auto and unmarked writes to confirm', () => {
    expect(resolveConfirmTier('read', undefined)).toBe('auto');
    expect(resolveConfirmTier('write', undefined)).toBe('confirm');
    expect(resolveConfirmTier('write', { confirm: 'dual' })).toBe('dual');
  });

  it('merges confirm tier onto findCommand / writeCommands', () => {
    const passwd = findCommand('sys_passwd');
    expect(passwd?.confirm).toBe('dual');
    expect(passwd?.dangerous).toBe(true);
    expect(passwd?.secretArgs).toEqual(['old', 'new']);

    const ipAddr = findCommand('ip_addr');
    expect(ipAddr?.confirm).toBe('dual');
    expect(ipAddr?.snapshotRead).toBe('show_lan');
    expect(ipAddr?.affectsNetwork).toBe(true);

    const commit = findCommand('sys_commit');
    expect(commit?.confirm).toBe('confirm');
    expect(commit?.skipCommit).toBe(true);
    expect(commit?.dangerous).toBe(false);

    const wanStatus = findCommand('wan_status');
    expect(wanStatus?.confirm).toBe('auto');
    expect(wanStatus?.dangerous).toBe(false);
  });

  it('marks dual-confirm tools (compat dangerous=true)', () => {
    const mustBeDual = [
      'sys_passwd',
      'sys_reboot',
      'wan_enable',
      'wan_disable',
      'dhcp_on',
      'dhcp_off',
      'mngt_sshport',
      'internet_set',
      'ip_addr',
      'ip_nmask',
      'vlan_off',
      'mngt_httpport',
      'ipf_rule',
      'user_account',
    ];
    for (const id of mustBeDual) {
      expect(findCommand(id)?.confirm, id).toBe('dual');
      expect(findCommand(id)?.dangerous, id).toBe(true);
    }
  });

  it('keeps all reads on auto', () => {
    for (const cmd of readCommands()) {
      expect(cmd.confirm, cmd.id).toBe('auto');
    }
  });

  it('redacts free-form credential params via secretArgs', () => {
    expect(findCommand('user_account')?.secretArgs).toEqual(['param', 'userName']);
    expect(findCommand('ldap_set')?.secretArgs).toEqual(['value']);
    expect(findCommand('tacacsplus_set')?.secretArgs).toEqual(['secret']);
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
