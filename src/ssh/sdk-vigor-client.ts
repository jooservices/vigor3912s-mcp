import { Vigor3912SClient } from '@jooservices/vigor3912s-sdk';
import type { TypedOperation } from '@jooservices/vigor3912s-sdk/operations';
import { Vigor3912SError, sdkErrorCodes } from '@jooservices/vigor3912s-sdk';
import type { Transport } from '@jooservices/vigor3912s-sdk/transport';
import { isForbidden } from '../commands/forbidden.js';
import { isAllowedReadCommand } from '../commands/read-allowlist.js';
import type { VigorConfig } from '../config.js';
import type { AnyOperation } from '../sdk/operation-index.js';
import { operationFor } from '../sdk/operation-index.js';
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

/**
 * MCP policy façade over the DrayOS SDK.
 *
 * Wire path: confirm/audit (MCP) → `invoke`/`execute` (SDK) → `SshClientTransport` → ssh-client.
 * Authorization / confirm / hard blocklist stay in MCP; the SDK does not authorize.
 */
export class SdkVigorClient implements VigorClient {
  private session: { transport: Transport; sdk: Vigor3912SClient } | null = null;
  private writeAuthorized: string | null = null;
  private closed = false;

  constructor(
    private readonly cfg: ClientConfig,
    private readonly transportFactory: (cfg: ClientConfig) => Transport = (value) =>
      new SshClientTransport(value),
  ) {}

  get lastCommandTiming(): CommandTiming | null {
    const transport = this.session?.transport as (Transport & { lastCommandTiming?: CommandTiming | null }) | undefined;
    return transport?.lastCommandTiming ?? null;
  }

  async connect(): Promise<void> {
    const transport = this.current().transport as Transport & { ensureConnected?: () => Promise<void> };
    await transport.ensureConnected?.();
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
    this.writeAuthorized = command;
  }

  async runWriteCommand(command: string, opts: RunCommandOptions = {}): Promise<string> {
    const authorized = this.writeAuthorized === command;
    this.writeAuthorized = null;
    if (!authorized) {
      throw new VigorCommandError('unauthorized', 'write command was not confirmed and was refused');
    }
    if (isForbidden(command)) {
      throw new VigorCommandError('invalid', `command is forbidden and was refused: ${command}`);
    }
    if (this.cfg.readOnly) {
      throw new VigorCommandError(
        'unauthorized',
        'read-only mode is enabled; write commands are refused',
      );
    }
    if (this.closed) {
      throw new VigorCommandError('closed', 'client is closed');
    }
    return this.exec(command, opts);
  }

  async runOperation(
    manifestId: string,
    input: unknown,
    opts: RunCommandOptions = {},
  ): Promise<string> {
    const op = operationFor(manifestId);
    if (!op) {
      throw new VigorCommandError('invalid', `unknown SDK operation and was refused: ${manifestId}`);
    }
    if (op.classification !== 'read') {
      throw new VigorCommandError(
        'invalid',
        `operation "${manifestId}" is not a read operation and was refused`,
      );
    }
    const frames = this.renderFrames(op, input);
    this.refuseForbiddenFrames(frames);
    if (this.closed) {
      throw new VigorCommandError('closed', 'client is closed');
    }
    return this.invokeOperation(op, input, opts);
  }

  async runWriteOperation(
    manifestId: string,
    input: unknown,
    opts: RunCommandOptions = {},
  ): Promise<string> {
    const authorizedCommand = this.writeAuthorized;
    this.writeAuthorized = null;
    const op = operationFor(manifestId);
    if (!op) {
      throw new VigorCommandError('invalid', `unknown SDK operation and was refused: ${manifestId}`);
    }
    if (op.classification === 'read') {
      throw new VigorCommandError(
        'invalid',
        `operation "${manifestId}" is not a write operation and was refused`,
      );
    }
    const frames = this.renderFrames(op, input);
    const rendered = frames.map((f) => f.command).join('\n');
    if (authorizedCommand !== rendered) {
      throw new VigorCommandError(
        'unauthorized',
        `write operation "${manifestId}" was not confirmed and was refused`,
      );
    }
    this.refuseForbiddenFrames(frames);
    if (this.cfg.readOnly) {
      throw new VigorCommandError(
        'unauthorized',
        'read-only mode is enabled; write commands are refused',
      );
    }
    if (this.closed) {
      throw new VigorCommandError('closed', 'client is closed');
    }
    return this.invokeOperation(op, input, opts);
  }

  async disconnect(): Promise<void> {
    this.closed = true;
    const session = this.session;
    this.session = null;
    await session?.transport.close('mcp_disconnect');
  }

  private current(): { transport: Transport; sdk: Vigor3912SClient } {
    if (this.closed) throw new VigorCommandError('closed', 'client is closed');
    if (!this.session) {
      const transport = this.transportFactory(this.cfg);
      this.session = {
        transport,
        // Allow diagnostic tools (ping/tracert) up to 60s; callers may lower via timeoutMs.
        sdk: Vigor3912SClient.fromTransport(transport, {
          limits: { commandTimeoutMs: 60_000 },
        }),
      };
    }
    return this.session;
  }

  private resetAfterSdkFailure(err: unknown): void {
    if (this.closed || !(err instanceof Vigor3912SError)) return;
    if (err.code !== sdkErrorCodes.outputLimitExceeded && err.code !== sdkErrorCodes.sessionClosed) return;
    const old = this.session;
    this.session = null;
    if (old) void old.transport.close('mcp_reset').catch(() => undefined);
  }

  private renderFrames(op: AnyOperation, input: unknown): readonly { readonly command: string }[] {
    try {
      return op.buildFrames(input);
    } catch (err) {
      throw mapSdkError(err);
    }
  }

  private refuseForbiddenFrames(frames: readonly { readonly command: string }[]): void {
    for (const frame of frames) {
      if (isForbidden(frame.command)) {
        throw new VigorCommandError(
          'invalid',
          `command is forbidden and was refused: ${frame.command}`,
        );
      }
    }
  }

  private async invokeOperation(
    op: AnyOperation,
    input: unknown,
    opts: RunCommandOptions,
  ): Promise<string> {
    const executeOpts = {
      ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    };
    try {
      const operation = op as unknown as TypedOperation<unknown, unknown>;
      const parsed = await this.current().sdk.invoke(operation, input, executeOpts);
      return formatInvokeResult(parsed);
    } catch (err) {
      this.resetAfterSdkFailure(err);
      throw mapSdkError(err);
    }
  }

  private async exec(command: string, opts: RunCommandOptions): Promise<string> {
    const executeOpts = {
      ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    };
    try {
      const result = await this.current().sdk.execute(command, executeOpts);
      return result.stdout;
    } catch (err) {
      this.resetAfterSdkFailure(err);
      throw mapSdkError(err);
    }
  }
}
