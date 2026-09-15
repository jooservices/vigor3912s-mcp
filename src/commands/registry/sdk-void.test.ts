import { describe, expect, it } from 'vitest';
import { operations } from '@jooservices/vigor3912s-sdk/operations';
import { buildVoidOperationIndex } from '../../sdk/void-operation-index.js';
import { allCommands, findCommand, REGISTRY } from './index.js';

describe('sdk_void family', () => {
  it('registers remaining void SDK CLI frames not covered by curated tools', () => {
    const voidIdx = buildVoidOperationIndex(operations);
    const zeroArgCli = new Set(
      allCommands()
        .filter((c) => Object.keys(c.args).length === 0)
        .map((c) => c.render({})),
    );
    const missing = [...voidIdx.keys()].filter((cli) => !zeroArgCli.has(cli));
    expect(missing, missing.join(', ')).toEqual([]);
  });

  it('keeps tool ids unique and renders stable CLI', () => {
    const ids = allCommands().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const voidFamily = REGISTRY.find((f) => f.family === 'sdk_void');
    expect(voidFamily).toBeDefined();
    expect(voidFamily!.commands.length).toBeGreaterThan(0);
    const sample = voidFamily!.commands[0]!;
    expect(findCommand(sample.id)?.render({})).toBe(sample.render({}));
  });
});
