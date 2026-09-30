import { describe, expect, it } from 'vitest';
import { operations } from '@jooservices/vigor3912s-sdk/operations';
import { inputSchemaFor } from '@jooservices/vigor3912s-sdk/schemas';
import { buildVoidOperationIndex } from '../../sdk/void-operation-index.js';
import { allCommands, findCommand, REGISTRY } from './index.js';
import { buildSdkGeneratedFamily, RELEASED_GENERATED_TOOL_IDS } from './families/sdk-generated.js';

describe('sdk-generated family', () => {
  it('registers every void SDK CLI frame (covered by manifestId, not by CLI-string heuristics)', () => {
    const voidIdx = buildVoidOperationIndex(operations);
    const coveredManifestIds = new Set(
      allCommands()
        .map((c) => c.sdk?.manifestId)
        .filter((id): id is string => id !== undefined),
    );
    const missing = [...voidIdx.values()]
      .map((op) => op.manifestId)
      .filter((id) => !coveredManifestIds.has(id));
    expect(missing, missing.join(', ')).toEqual([]);
  });

  it('keeps tool ids unique across curated + generated tools', () => {
    const ids = allCommands().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves generated ids released by MCP 1.0.0 after curated migration', () => {
    for (const id of Object.values(RELEASED_GENERATED_TOOL_IDS)) {
      expect(findCommand(id), id).toBeDefined();
      expect(findCommand(id)!.sdk, id).toBeDefined();
    }
  });

  it('throws when a released generated id collides with a curated tool', () => {
    expect(() => buildSdkGeneratedFamily([{
      family: 'test',
      desc: 'test family',
      commands: [{
        id: 'service',
        family: 'test',
        kind: 'read',
        desc: 'test command',
        render: () => 'service',
        args: {},
      }],
    }])).toThrow('sdk-generated: released tool id collision for "service"');
  });

  it('renders a stable CLI for a void-classified generated tool', () => {
    const generatedFamily = REGISTRY.find((f) => f.family === 'sdk_generated');
    expect(generatedFamily).toBeDefined();
    expect(generatedFamily!.commands.length).toBeGreaterThan(0);
    expect(generatedFamily!.commands.every((cmd) => cmd.family === 'sdk_generated')).toBe(true);
    const voidSample = generatedFamily!.commands.find(
      (c) => c.sdk && inputSchemaFor(c.sdk.manifestId) === null,
    );
    expect(voidSample).toBeDefined();
    expect(findCommand(voidSample!.id)?.render({})).toBe(voidSample!.render({}));
  });
});
