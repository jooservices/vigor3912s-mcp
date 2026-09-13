/**
 * Transport-agnostic client contract for talking to a DrayTek Vigor 3912S.
 *
 * `VigorClient` is the interface the MCP tool layer depends on. The current
 * implementation is `SshVigorClient` (ssh2 interactive shell). A future
 * 3912S SDK can replace it by implementing this same interface and swapping
 * the instance in `buildServer()` — the registry, tools, logging, and confirm
 * gate stay unchanged.
 *
 * Implementations MUST honor the safety contract:
 * - `runCommand` sends READ commands only.
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