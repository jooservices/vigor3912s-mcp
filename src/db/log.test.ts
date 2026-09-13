import { describe, expect, it } from 'vitest';
import { LogStore, redactArgs, redactCommand } from './log.js';

describe('redaction', () => {
  it('redacts secret arg values from a rendered command', () => {
    const cmd = 'sys passwd oldSecret newSecret';
    expect(redactCommand(cmd, { old: 'oldSecret', new: 'newSecret' }, ['old', 'new'])).toBe(
      'sys passwd *** ***',
    );
  });

  it('redacts secret args in the args JSON', () => {
    const args = { wan: 1, password: 's3cret' };
    const out = JSON.parse(redactArgs(args, ['password']));
    expect(out.password).toBe('***');
    expect(out.wan).toBe(1);
  });

  it('does not touch non-secret args', () => {
    const out = JSON.parse(redactArgs({ wan: 2, name: 'WAN2' }, ['password']));
    expect(out.wan).toBe(2);
    expect(out.name).toBe('WAN2');
  });
});

describe('LogStore', () => {
  it('logs requests and write audits to an in-memory db', () => {
    const store = new LogStore(':memory:');
    store.request({
      toolId: 'wan_status',
      kind: 'read',
      command: 'wan status',
      argsJson: '{}',
      outcome: 'ok',
      durationMs: 12,
      output: 'BWAN1: Offline',
    });
    store.writeAudit({
      requestId: null,
      toolId: 'wan_disable',
      command: 'wan disable WAN1',
      status: 'preview',
      success: null,
    });
    store.writeAudit({
      requestId: 1,
      toolId: 'wan_disable',
      command: 'wan disable WAN1',
      status: 'executed',
      success: true,
      beforeSnapshot: 'BWAN1: Online',
      afterSnapshot: 'BWAN1: Offline',
    });
    const req = store.query<Array<{ c: number }>>('SELECT COUNT(*) AS c FROM requests');
    expect(req[0]?.c).toBe(1);
    const audits = store.query<Array<{
      status: string;
      success: number | null;
      before_snapshot: string | null;
    }>>('SELECT * FROM write_audit ORDER BY id');
    expect(audits).toHaveLength(2);
    expect(audits[0]?.status).toBe('preview');
    expect(audits[1]?.status).toBe('executed');
    expect(audits[1]?.success).toBe(1);
    expect(audits[1]?.before_snapshot).toBe('BWAN1: Online');
    store.close();
  });

  it('returns null lastRequestId when empty', () => {
    const store = new LogStore(':memory:');
    expect(store.lastRequestId).toBeNull();
    store.request({
      toolId: 'x',
      kind: 'read',
      command: 'x',
      argsJson: '{}',
      outcome: 'ok',
      durationMs: 1,
    });
    expect(store.lastRequestId).toBeTypeOf('number');
    store.close();
  });

  it('never throws when the db is unavailable', () => {
    const store = new LogStore(':memory:');
    store.close(); // force db to null
    expect(() => {
      store.request({
        toolId: 'x',
        kind: 'read',
        command: 'x',
        argsJson: '{}',
        outcome: 'ok',
        durationMs: 1,
      });
      store.writeAudit({
        requestId: null,
        toolId: 'x',
        command: 'x',
        status: 'preview',
        success: null,
      });
    }).not.toThrow();
  });
});