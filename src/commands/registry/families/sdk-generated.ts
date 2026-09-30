import { allOperations } from '../../../sdk/operation-index.js';
import { registerExtraWritePolicy } from '../../write-policy.js';
import { S } from '../builders.js';
import type { CommandDef, FamilyDef } from '../types.js';

/** `cli.ip.bgp.show` → `ip_bgp_show`. */
export function manifestToToolId(manifestId: string): string {
  const trimmed = manifestId.replace(/^cli\./, '').replace(/\./g, '_');
  return trimmed.replace(/[^a-zA-Z0-9_]/g, '_');
}

function collectIds(families: readonly FamilyDef[]): Set<string> {
  const out = new Set<string>();
  for (const family of families) {
    for (const cmd of family.commands) out.add(cmd.id);
  }
  return out;
}

/** Every SDK `manifestId` already bound to a curated tool (via `cmd.sdk`). */
function collectCoveredManifestIds(families: readonly FamilyDef[]): Set<string> {
  const out = new Set<string>();
  for (const family of families) {
    for (const cmd of family.commands) {
      if (cmd.sdk && !cmd.sdk.partial) out.add(cmd.sdk.manifestId);
    }
  }
  return out;
}

/** Generated ids shipped in MCP 1.0.0 that must remain addressable. */
export const RELEASED_GENERATED_TOOL_IDS: Readonly<Record<string, string>> = {
  'cli.service': 'service',
  'cli.wan.detect': 'sdk_wan_detect',
};

/**
 * MCP tools for every implemented SDK `TypedOperation` not already covered by
 * a curated tool's `cmd.sdk.manifestId` (including curated tools auto-linked
 * to void operations — see `attachSdkVoidBindings` in `registry/index.ts`).
 *
 * Coverage is by `manifestId` only: a curated *parameterized* raw tool that
 * happens to render the same CLI as one of these operations is not yet
 * linked (that migration is tracked separately), so both tools coexist here
 * until the curated tool gets its own `cmd.sdk` binding — at which point this
 * generated duplicate disappears automatically.
 */
export function buildSdkGeneratedFamily(curated: readonly FamilyDef[]): FamilyDef {
  const covered = collectCoveredManifestIds(curated);
  const usedIds = collectIds(curated);
  const commands: CommandDef[] = [];
  const ops = [...allOperations()].sort((a, b) => a.manifestId.localeCompare(b.manifestId));

  for (const op of ops) {
    const releasedId = RELEASED_GENERATED_TOOL_IDS[op.manifestId];
    if (covered.has(op.manifestId) && !releasedId) continue;

    let id = releasedId ?? manifestToToolId(op.manifestId);
    if (usedIds.has(id)) {
      if (releasedId) {
        throw new Error(`sdk-generated: released tool id collision for "${id}"`);
      }
      id = `sdk_${id}`;
    }
    usedIds.add(id);

    const desc = `SDK ${op.manifestId} (${op.classification})`;
    const cmd = S(id, 'sdk_generated', op.manifestId, desc);
    commands.push(cmd);
    if (op.classification === 'destructive') {
      registerExtraWritePolicy(id, { confirm: 'dual' });
    }
  }

  return {
    family: 'sdk_generated',
    desc: 'Auto-registered SDK operations not already curated (schema-derived args).',
    commands,
  };
}
