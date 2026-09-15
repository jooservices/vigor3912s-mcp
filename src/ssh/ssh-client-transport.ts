import { SshClient, SshClientError, type ExecResult } from '@jooservices/ssh-client';
import type {
  CommandFrame,
  ExecutionLimits,
  Transport,
  TransportExchange,
} from '@jooservices/vigor3912s-sdk/transport';
import type { VigorConfig } from '../config.js';
import type { CommandTiming } from './client.js';
import { VigorCommandError, type VigorErrorCode } from './client.js';

type TransportConfig = Pick<
  VigorConfig,
  'host' | 'port' | 'username' | 'password' | 'sshHostFingerprint' | 'sshInsecureSkipHostVerify'
>;

function mapTransportError(err: unknown): VigorCommandError {
  if (err instanceof VigorCommandError) return err;
  if (err instanceof SshClientError) {
    const code: VigorErrorCode =
      err.code === 'connect' ||
      err.code === 'auth' ||
      err.code === 'timeout' ||
      err.code === 'closed' ||
      err.code === 'invalid'
        ? err.code
        : 'connect';
    return new VigorCommandError(code, err.message);
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new VigorCommandError('connect', msg);
}

/**
 * SDK `Transport` backed by `@jooservices/ssh-client`.
 * DrayOS domain (framing / typed ops) stays in the SDK; this only moves bytes.
 */
export class SshClientTransport implements Transport {
  private readonly ssh: SshClient;
  private open = true;
  private timing: CommandTiming | null = null;

  constructor(cfg: TransportConfig) {
    this.ssh = new SshClient({
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: cfg.password,
      ...(cfg.sshInsecureSkipHostVerify
        ? { insecureSkipVerify: true }
        : { hostFingerprint: cfg.sshHostFingerprint }),
      term: 'vt100',
      rows: 200,
      cols: 200,
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  get lastCommandTiming(): CommandTiming | null {
    return this.timing;
  }

  async ensureConnected(): Promise<void> {
    try {
      await this.ssh.connect();
    } catch (err) {
      throw mapTransportError(err);
    }
  }

  async send(
    frame: CommandFrame,
    limits: ExecutionLimits,
    signal: AbortSignal,
  ): Promise<TransportExchange> {
    if (!this.open) {
      throw new VigorCommandError('closed', 'transport is closed');
    }
    try {
      await this.ssh.connect();
      const result: ExecResult = await this.ssh.exec(frame.command, {
        timeoutMs: limits.commandTimeoutMs,
        idleTimeoutMs: limits.idleTimeoutMs,
        maxOutputBytes: limits.maxOutputBytes,
        signal,
      });
      this.timing = {
        sendAt: result.sendAt,
        recvAt: result.recvAt,
        connectMs: result.connectMs,
      };
      return { stdout: result.stdout, stderr: '' };
    } catch (err) {
      throw mapTransportError(err);
    }
  }

  async close(_reason: string): Promise<void> {
    this.open = false;
    try {
      await this.ssh.disconnect();
    } catch {
      /* ignore */
    }
  }
}
