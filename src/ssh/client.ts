/**
 * MCP tool-layer client contract.
 *
 * Production implementation is `SdkVigorClient`: MCP policy (allowlist /
 * blocklist / confirm authorize / read-only) wraps `@jooservices/vigor3912s-sdk`
 * over an SSH `Transport` adapter. Confirm gate, audit, and curated tools stay
 * in MCP; the SDK owns DrayOS framing / typed ops.
 *
 * Implementations MUST honor:
 * - `runCommand` sends READ commands only (MCP allowlist).
 * - `runWriteCommand` executes only a command previously passed to
 *   `authorizeWrite` (single-shot).
 */

export type VigorErrorCode =
  | 'connect'
  | 'auth'
  | 'timeout'
  | 'closed'
  | 'invalid'
  | 'unauthorized';

export class VigorCommandError extends Error {
  readonly code: VigorErrorCode;
  constructor(code: VigorErrorCode, message: string) {
    super(message);
    this.name = 'VigorCommandError';
    this.code = code;
  }
}

export interface RunCommandOptions {
  timeoutMs?: number;
  maxPages?: number;
  signal?: AbortSignal;
}

/** Timing of the most recent command interaction (used by the log layer). */
export interface CommandTiming {
  /** Epoch ms when the CLI command was written to the shell. */
  sendAt: number;
  /** Epoch ms when the response prompt was received (or the attempt failed). */
  recvAt: number;
  /** Epoch ms spent connecting/reconnecting before this command (0 if idle). */
  connectMs: number;
}

export interface VigorClient {
  /** Establish the session (lazy; no-op if already connected). */
  connect(): Promise<void>;
  /** Send a READ command and return its cleaned output. */
  runCommand(command: string, opts?: RunCommandOptions): Promise<string>;
  /** Authorize a confirmed write command for its next execution. */
  authorizeWrite(command: string): void;
  /** Execute a previously authorized write command (single-shot). */
  runWriteCommand(command: string, opts?: RunCommandOptions): Promise<string>;
  /** Close the session. */
  disconnect(): Promise<void>;
  /** Timing of the most recent command. */
  readonly lastCommandTiming: CommandTiming | null;
}
