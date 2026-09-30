import { describe, expect, it } from 'vitest';
import { operations } from '@jooservices/vigor3912s-sdk/operations';
import {
  allOperations,
  buildOperationIndex,
  operationFor,
  resetOperationIndexForTests,
} from './operation-index.js';

describe('operationIndex', () => {
  it('indexes every SDK typed operation by manifestId', () => {
    resetOperationIndexForTests();
    const index = buildOperationIndex(operations);
    expect(index.get('cli.ip.addr')?.manifestId).toBe('cli.ip.addr');
    // cli.sys.version is a void (zero-arg, single-frame) read op.
    expect(index.get('cli.sys.version')?.manifestId).toBe('cli.sys.version');
  });

  it('resolves via memoized helpers', () => {
    resetOperationIndexForTests();
    expect(operationFor('cli.ip.addr')?.manifestId).toBe('cli.ip.addr');
    expect(operationFor('not.a.real.op')).toBeUndefined();
    expect(allOperations().length).toBeGreaterThan(0);
    expect(allOperations().some((op) => op.manifestId === 'cli.sys.version')).toBe(true);
  });

  it('tolerates the same operation object reached via more than one path (domain export + aggregated array)', () => {
    const sameOp = {
      manifestId: 'dup.same.ref',
      classification: 'read',
      buildFrames: () => [{ command: 'dup same ref' }],
      parse: () => null,
    };
    const index = buildOperationIndex({
      named: sameOp,
      operations: [sameOp],
    });
    expect(index.get('dup.same.ref')).toBe(sameOp);
  });

  it('throws when two different operation objects share a manifestId', () => {
    const opA = {
      manifestId: 'dup.id',
      classification: 'read',
      buildFrames: () => [{ command: 'a' }],
      parse: () => null,
    };
    const opB = {
      manifestId: 'dup.id',
      classification: 'write',
      buildFrames: () => [{ command: 'b' }],
      parse: () => null,
    };
    expect(() => buildOperationIndex({ a: opA, b: opB })).toThrow(/duplicate manifestId "dup\.id"/);
  });
});
