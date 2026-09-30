import type { ZodRawShape } from 'zod';
import type { ConfirmTier } from '../tool-policy.js';

export type CommandKind = 'read' | 'write';

/** SDK-backed execution metadata for a `CommandDef`. */
export interface CommandSdkBinding {
  /** SDK TypedOperation manifest id this tool invokes. */
  manifestId: string;
  /** Map MCP tool args to the SDK operation's typed input. */
  toInput?: (args: Record<string, unknown>) => unknown;
  /** Validate/narrow input before invoke (populated once SDK schemas ship). */
  validate?: (input: unknown) => unknown;
  /**
   * True when this tool pins only a subset of the operation's input variants
   * (e.g. one `action`). Partial bindings do not suppress the generated tool,
   * so every variant stays reachable.
   */
  partial?: boolean;
}

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
   * `confirm` unless tool-policy sets `dual` (or rarely `auto`).
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
  /** Router output can contain credentials or sensitive configuration; do not persist it. */
  sensitiveOutput?: boolean;
  /** Do not auto-run `sys commit` after this write (e.g. reboot, test mail). */
  skipCommit?: boolean;
  /** When set, this tool executes via the SDK's typed `invoke()` instead of a raw string. */
  sdk?: CommandSdkBinding;
}

export interface FamilyDef {
  family: string;
  desc: string;
  commands: CommandDef[];
}
