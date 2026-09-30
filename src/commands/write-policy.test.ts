import { describe, expect, it, vi } from 'vitest';
import { operationFor } from '../sdk/operation-index.js';
import { allCommands, findCommand, readCommands, writeCommands } from './registry/index.js';
import { applyToolPolicy, WRITE_POLICY, resolveConfirmTier } from './tool-policy.js';

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

  it('derives dual confirmation from destructive SDK classification', () => {
    expect(operationFor('cli.fs.format')?.classification).toBe('destructive');
    const cmd = applyToolPolicy({
      id: 'test_curated_destructive',
      kind: 'write',
      sdk: { manifestId: 'cli.fs.format' },
    });

    expect(cmd.confirm).toBe('dual');
  });

  it('merges SDK-derived secret arguments with explicit write policy', () => {
    const cmd = applyToolPolicy({
      id: 'ip_bgp',
      kind: 'write',
      secretArgs: ['community'],
    });
    expect(cmd.secretArgs).toEqual(['community', 'key']);
  });

  it('keeps resolved policies stable after the registry is re-imported', async () => {
    const snapshot = (commands: ReturnType<typeof allCommands>) =>
      commands.map(({ id, confirm, affectsNetwork, secretArgs, snapshotRead, skipCommit }) => ({
        id,
        confirm,
        affectsNetwork,
        secretArgs,
        snapshotRead,
        skipCommit,
      }));
    const before = snapshot(allCommands());
    const policyIds = Object.keys(WRITE_POLICY).sort();

    vi.resetModules();
    const [{ allCommands: reloadedCommands }, { WRITE_POLICY: reloadedPolicy }] = await Promise.all([
      import('./registry/index.js'),
      import('./tool-policy.js'),
    ]);

    expect(snapshot(reloadedCommands())).toEqual(before);
    expect(Object.keys(reloadedPolicy).sort()).toEqual(policyIds);
  });

  it('merges confirm tier onto findCommand / writeCommands', () => {
    const passwd = findCommand('sys_passwd');
    expect(passwd?.confirm).toBe('dual');
    expect(passwd?.secretArgs).toEqual(['old', 'new']);

    const ipAddr = findCommand('ip_addr');
    expect(ipAddr?.confirm).toBe('dual');
    expect(ipAddr?.snapshotRead).toBe('show_lan');
    expect(ipAddr?.affectsNetwork).toBe(true);

    const commit = findCommand('sys_commit');
    expect(commit?.confirm).toBe('confirm');
    expect(commit?.skipCommit).toBe(true);

    const wanStatus = findCommand('wan_status');
    expect(wanStatus?.confirm).toBe('auto');
  });

  it('marks dual-confirm tools', () => {
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

  it('redacts credentials from SDK-generated write tools', () => {
    const expected: Record<string, string[]> = {
      ddns_set: ['password'],
      ddns_set_update: ['password'],
      internet: ['password'],
      ip6_internet: ['password'],
      ip_bgp: ['key'],
      mngt_certimport: ['password'],
      radius_client_add: ['secret'],
      service_login: ['password'],
      sdk_linux_setlinuxip: ['password'],
      sys_adminuser: ['password'],
      user: ['param', 'userName'],
      vpn_wg_keyset: ['privateKey'],
    };
    for (const [id, secretArgs] of Object.entries(expected)) {
      expect(findCommand(id)?.secretArgs, id).toEqual(secretArgs);
    }
  });

  it('points snapshotRead at existing read tools', () => {
    for (const [id, policy] of Object.entries(WRITE_POLICY)) {
      if (!policy.snapshotRead) continue;
      const snap = findCommand(policy.snapshotRead);
      expect(snap?.kind, `${id} -> ${policy.snapshotRead}`).toBe('read');
    }
  });
});
