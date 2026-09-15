import { describe, expect, it } from 'vitest';
import { operations } from '@jooservices/vigor3912s-sdk/operations';
import {
  buildVoidOperationIndex,
  resetVoidOperationIndexForTests,
  voidOperationForCommand,
} from './void-operation-index.js';

describe('voidOperationIndex', () => {
  it('indexes fixed zero-arg SDK operations by CLI command', () => {
    resetVoidOperationIndexForTests();
    const index = buildVoidOperationIndex(operations);
    expect(index.get('sys version')?.manifestId).toBe('cli.sys.version');
    expect(index.get('wan status')?.manifestId).toBe('cli.wan.status');
    expect(index.get('sys commit')?.manifestId).toBe('cli.sys.commit');
  });

  it('resolves via memoized lookup helper', () => {
    resetVoidOperationIndexForTests();
    expect(voidOperationForCommand('sys version')?.manifestId).toBe('cli.sys.version');
    expect(voidOperationForCommand('not a real command')).toBeUndefined();
  });

  it('ignores non-operation nodes when indexing', () => {
    const index = buildVoidOperationIndex({
      nested: [{ hello: true }, null, 'x'],
      leaf: {
        manifestId: 'x',
        buildFrames: () => [{ command: 'x' }],
        parse: () => null,
      },
    });
    expect(index.get('x')?.manifestId).toBe('x');
  });

  it('skips multi-frame ops, empty commands, and buildFrames failures', () => {
    const index = buildVoidOperationIndex({
      multi: {
        manifestId: 'multi',
        buildFrames: () => [{ command: 'a' }, { command: 'b' }],
        parse: () => null,
      },
      empty: {
        manifestId: 'empty',
        buildFrames: () => [{ command: '' }],
        parse: () => null,
      },
      needsInput: {
        manifestId: 'needs',
        buildFrames: () => {
          throw new Error('needs typed input');
        },
        parse: () => null,
      },
      ok: {
        manifestId: 'ok',
        buildFrames: () => [{ command: 'ok cmd' }],
        parse: () => null,
      },
    });
    expect(index.get('ok cmd')?.manifestId).toBe('ok');
    expect(index.size).toBe(1);
  });
});
