import type { ZodRawShape } from 'zod';
import type { ConfirmTier } from '../write-policy.js';

export type CommandKind = 'read' | 'write';

export interface CommandDef {
  id: string;
  family: string;
  kind: CommandKind;
  desc: string;
  /** Build the exact CLI string for the router from tool args. */
  render: (args: Record<string, unknown>) => string;
  /** zod schema for tool arguments (may be empty object for no-arg commands). */
  args: ZodRawShape;
  /**
   * MCP confirm tier (Layer 2). Reads resolve to `auto`; writes default
   * `confirm` unless write-policy sets `dual` (or rarely `auto`).
   */
  confirm?: ConfirmTier;
  /** Whether this command changes network-affecting state (extra warning). */
  affectsNetwork?: boolean;
  /** Optional formatter to structure the raw CLI output (falls back to raw). */
  format?: (raw: string, args: Record<string, unknown>) => unknown;
  /** Read command id used to snapshot router state before/after this write. */
  snapshotRead?: string;
  /** Arg keys whose values must be redacted in logs (passwords, secrets). */
  secretArgs?: string[];
  /**
   * Compatibility alias for `confirm === 'dual'`.
   * Dual-confirm writes require `acknowledge: true` on the confirm call.
   */
  dangerous?: boolean;
  /** Do not auto-run `sys commit` after this write (e.g. reboot, test mail). */
  skipCommit?: boolean;
}

export interface FamilyDef {
  family: string;
  desc: string;
  commands: CommandDef[];
}
