import type {
  CommandTiming,
  RunCommandOptions,
  VigorClient,
} from '../ssh/client.js';
import { VigorCommandError } from '../ssh/client.js';

/**
 * In-memory VigorClient for MCP unit tests (no SSH).
 * Scripts commands via `FakeVigorClient.script` (command → stdout).
 */
export class FakeVigorClient implements VigorClient {
  static instances: FakeVigorClient[] = [];
  static script: Record<string, string | string[]> = {};

  readonly written: string[] = [];
  private writeAuthorized = new Set<string>();
  private lastTiming: CommandTiming | null = null;
  private closed = false;

  constructor(private readonly readOnly = false) {
    FakeVigorClient.instances.push(this);
  }

  get lastCommandTiming(): CommandTiming | null {
    return this.lastTiming;
  }

  /** Compatibility helper for older tests that inspected FakeStream.written. */
  getStream(): { written: string[] } {
    return { written: this.written };
  }

  async connect(): Promise<void> {
    /* no-op */
  }

  async runCommand(command: string, _opts?: RunCommandOptions): Promise<string> {
    if (this.closed) throw new VigorCommandError('closed', 'client is closed');
    return this.exec(command);
  }

  authorizeWrite(command: string): void {
    this.writeAuthorized.add(command);
  }

  async runWriteCommand(command: string, _opts?: RunCommandOptions): Promise<string> {
    if (this.readOnly) {
      throw new VigorCommandError('unauthorized', 'read-only mode is enabled; write commands are refused');
    }
    if (!this.writeAuthorized.has(command)) {
      throw new VigorCommandError(
        'unauthorized',
        `write command was not confirmed and was refused: ${command}`,
      );
    }
    this.writeAuthorized.delete(command);
    if (this.closed) throw new VigorCommandError('closed', 'client is closed');
    return this.exec(command);
  }

  async disconnect(): Promise<void> {
    this.closed = true;
  }

  private exec(command: string): string {
    this.written.push(`${command}\r`);
    const now = Date.now();
    this.lastTiming = { sendAt: now, recvAt: now, connectMs: 0 };
    const resp = FakeVigorClient.script[command];
    if (resp === undefined) {
      throw new VigorCommandError('timeout', `no script for: ${command}`);
    }
    return Array.isArray(resp) ? resp.join('\n') : resp;
  }
}
