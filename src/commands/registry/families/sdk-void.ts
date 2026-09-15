import { operations } from '@jooservices/vigor3912s-sdk/operations';
import { buildVoidOperationIndex } from '../../../sdk/void-operation-index.js';
import { registerExtraWritePolicy } from '../../write-policy.js';
import { R, W } from '../builders.js';
import type { CommandDef, FamilyDef } from '../types.js';

function manifestToToolId(manifestId: string): string {
  // cli.ip.bgp.show → ip_bgp_show
  const trimmed = manifestId.replace(/^cli\./, '').replace(/\./g, '_');
  return trimmed.replace(/[^a-zA-Z0-9_]/g, '_');
}

function collectZeroArgCli(families: readonly FamilyDef[]): Set<string> {
  const out = new Set<string>();
  for (const family of families) {
    for (const cmd of family.commands) {
      if (Object.keys(cmd.args).length > 0) continue;
      try {
        out.add(cmd.render({}));
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

function collectIds(families: readonly FamilyDef[]): Set<string> {
  const out = new Set<string>();
  for (const family of families) {
    for (const cmd of family.commands) out.add(cmd.id);
  }
  return out;
}

/**
 * MCP tools for SDK TypedOperations that accept undefined and emit one fixed
 * CLI frame, excluding CLI already covered by curated families.
 */
export function buildSdkVoidFamily(curated: readonly FamilyDef[]): FamilyDef {
  const existingCli = collectZeroArgCli(curated);
  const usedIds = collectIds(curated);
  const commands: CommandDef[] = [];
  const voidIdx = buildVoidOperationIndex(operations);

  for (const [cli, op] of [...voidIdx.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (existingCli.has(cli)) continue;

    let id = manifestToToolId(op.manifestId);
    if (usedIds.has(id)) id = `sdk_${id}`;
    usedIds.add(id);

    const desc = `SDK ${op.manifestId} (${op.classification})`;
    if (op.classification === 'read') {
      commands.push(R(id, 'sdk_void', cli, desc));
    } else {
      commands.push(W(id, 'sdk_void', () => cli, {}, desc));
      if (op.classification === 'destructive') {
        registerExtraWritePolicy(id, { confirm: 'dual' });
      }
    }
  }

  return {
    family: 'sdk_void',
    desc: 'Auto-registered zero-arg SDK operations not already curated.',
    commands,
  };
}
