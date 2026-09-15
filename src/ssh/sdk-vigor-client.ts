import { Vigor3912SClient } from '@jooservices/vigor3912s-sdk';
import type { TypedOperation } from '@jooservices/vigor3912s-sdk/operations';
import { isAllowedReadCommand } from '../commands/read-allowlist.js';
import type { VigorConfig } from '../config.js';
import { voidOperationForCommand } from '../sdk/void-operation-index.js';
import {
  type CommandTiming,
  type RunCommandOptions,
  VigorCommandError,
  type VigorClient,
} from './client.js';
import { formatInvokeResult, mapSdkError } from './sdk-error.js';
import { SshClientTransport } from './ssh-client-transport.js';

export { VigorCommandError };
export { formatInvokeResult, mapSdkError } from './sdk-error.js';

type ClientConfig = Pick<
  VigorConfig,
  | 'host'
  | 'port'
  | 'username'
  | 'password'
  | 'readOnly'
  | 'sshHostFingerprint'
  | 'sshInsecureSkipHostVerify'
>;

const FORBIDDEN_EXACT = new Set(['sys cfg default', 'sys halt', 'mngt rmtcfg enable']);
const FORBIDDEN_PREFIXES = ['linux clean', 'sys cfg default'];

function isForbidden(command: string): boolean {
  const c = command.trim();
  if (FORBIDDEN_EXACT.has(c)) return true;
  return FORBIDDEN_PREFIXES.some((p) => c.startsWith(p));
}

/**
 * MCP policy façade over the DrayOS SDK.
 *
 * Wire path: confirm/audit (MCP) → `invoke`/`execute` (SDK) → `SshClientTransport` → ssh-client.
 * Authorization / confirm / hard blocklist stay in MCP; the SDK does not authorize.
 */
export class SdkVigorClient implements VigorClient {
  private readonly transport: SshClientTransport;
  private readonly sdk: Vigor3912SClient;
  private writeAuthorized = new Set<string>();
  private closed = false;

  constructor(private readonly cfg: ClientConfig) {
    this.transport = new SshClientTransport(cfg);
    // Allow diagnostic tools (ping/tracert) up to 60s; callers may still lower via timeoutMs.
    this.sdk = Vigor3912SClient.fromTransport(this.transport, {
      limits: { commandTimeoutMs: 60_000 },
    });
  }

  get lastCommandTiming(): CommandTiming | null {
    return this.transport.lastCommandTiming;
  }

  async connect(): Promise<void> {
    await this.transport.ensureConnected();
  }

  async runCommand(command: string, opts: RunCommandOptions = {}): Promise<string> {
    if (!isAllowedReadCommand(command)) {
      throw new VigorCommandError(
        'invalid',
        `command is not a registered read command and was refused: ${command}`,
      );
    }
    if (isForbidden(command)) {
      throw new VigorCommandError('invalid', `command is forbidden and was refused: ${command}`);
    }
    if (this.closed) {
      throw new VigorCommandError('closed', 'client is closed');
    }
    return this.exec(command, opts);
  }

  authorizeWrite(command: string): void {
    this.writeAuthorized.add(command);
  }

  async runWriteCommand(command: string, opts: RunCommandOptions = {}): Promise<string> {
    if (isForbidden(command)) {
      throw new VigorCommandError('invalid', `command is forbidden and was refused: ${command}`);
    }
    if (this.cfg.readOnly) {
      throw new VigorCommandError(
        'unauthorized',
        'read-only mode is enabled; write commands are refused',
      );
    }
    if (!this.writeAuthorized.has(command)) {
      throw new VigorCommandError(
        'unauthorized',
        `write command was not confirmed and was refused: ${command}`,
      );
    }
    this.writeAuthorized.delete(command);
    if (this.closed) {
      throw new VigorCommandError('closed', 'client is closed');
    }
    return this.exec(command, opts);
  }

  async disconnect(): Promise<void> {
    this.closed = true;
    await this.transport.close('mcp_disconnect');
  }

  private async exec(command: string, opts: RunCommandOptions): Promise<string> {
    const executeOpts = {
      ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    };
    try {
      const typed = voidOperationForCommand(command);
      if (typed !== undefined) {
        const operation = typed as TypedOperation<undefined, unknown>;
        const parsed = await this.sdk.invoke(operation, undefined, executeOpts);
        return formatInvokeResult(parsed);
      }
      const result = await this.sdk.execute(command, executeOpts);
      return result.stdout;
    } catch (err) {
      throw mapSdkError(err);
    }
  }
}
