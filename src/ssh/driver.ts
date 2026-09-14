import { Client, type ClientChannel } from 'ssh2';
import { isAllowedReadCommand } from '../commands/read-allowlist.js';
import type { VigorConfig } from '../config.js';
import {
  type CommandTiming,
  type RunCommandOptions,
  VigorCommandError,
  type VigorClient,
  type VigorErrorCode,
} from './client.js';

export { VigorCommandError } from './client.js';
export type { CommandTiming, RunCommandOptions, VigorErrorCode } from './client.js';

type DriverConfig = Pick<VigorConfig, 'host' | 'port' | 'username' | 'password' | 'readOnly'>;

interface Waiter {
  stream: ClientChannel;
  start: number;
  morePos: number;
  pageKeys: number;
  maxPages: number;
  timer: ReturnType<typeof setTimeout>;
  settleTimer: ReturnType<typeof setTimeout> | null;
  sawMore: boolean;
  command: string;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}

const PROMPT_RE = /(?:>|#)\s*$/;
const MORE_RE = /---\s*MORE\s*---/;
const ECHO_STRIP = /^\s*(?:>|#)\s*/;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_PAGES = 60;
/** Cap unsolicited SSH data when no command waiter is active. */
const MAX_IDLE_BUF = 64 * 1024;

/**
 * HARD blocklist: commands that must never be executed, regardless of the
 * registry. Defense-in-depth in case a future registry entry ever maps to one
 * of these (factory reset, shutdown, wiping Linux apps, exposing management
 * to the Internet).
 */
const FORBIDDEN_EXACT = new Set(['sys cfg default', 'sys halt', 'mngt rmtcfg enable']);
const FORBIDDEN_PREFIXES = ['linux clean', 'sys cfg default'];

function isForbidden(command: string): boolean {
  const c = command.trim();
  if (FORBIDDEN_EXACT.has(c)) return true;
  return FORBIDDEN_PREFIXES.some((p) => c.startsWith(p));
}

function cleanOutput(raw: string, command: string): string {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cmdEcho = new RegExp(
    `^\\s*(?:>|#)?\\s*${escaped}\\s*(?:\r?\n|$)`,
    'm',
  );
  let body = raw.replace(cmdEcho, '');
  body = body.replace(/\r/g, '').replace(/-{3}\s*MORE\s*-{3}.*$/gm, '');
  const lines: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.replace(ECHO_STRIP, '').trimEnd();
    if (trimmed.trim() === '') continue;
    lines.push(trimmed);
  }
  while (lines.length && PROMPT_RE.test(lines[lines.length - 1]!.trim())) {
    lines.pop();
  }
  return lines.join('\n');
}

/**
 * SSH interactive-shell implementation of `VigorClient` for the DrayOS CLI.
 *
 * DrayOS does NOT support the SSH exec channel: commands must be typed into an
 * interactive shell and the output read until the prompt returns. All tools go
 * through this single client (one SSH session, lazy reconnect). A future 3912S
 * SDK can replace this class by implementing the `VigorClient` interface.
 */
export class SshVigorClient implements VigorClient {
  private ssh: Client | null = null;
  private stream: ClientChannel | null = null;
  private buf = '';
  private waiter: Waiter | null = null;
  private connecting: Promise<void> | null = null;
  private closed = false;
  /** Write commands authorized (via confirm gate) for the next execution. */
  private writeAuthorized = new Set<string>();
  /** Timing of the most recent command (used by the log layer). */
  private lastTiming: CommandTiming | null = null;
  private pendingConnectMs = 0;
  /** Serializes every command so concurrent tool calls never interleave. */
  private commandChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly cfg: DriverConfig) {}

  get lastCommandTiming(): CommandTiming | null {
    return this.lastTiming;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.commandChain.then(fn, fn);
    this.commandChain = run.catch(() => undefined);
    return run;
  }

  async connect(): Promise<void> {
    if (this.stream && !this.stream.destroyed) return;
    if (this.connecting) return this.connecting;
    this.connecting = this.openSession().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private openSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ssh = new Client();
      this.ssh = ssh;
      let settled = false;
      const fail = (code: VigorErrorCode, message: string) => {
        if (settled) return;
        settled = true;
        this.teardown();
        reject(new VigorCommandError(code, message));
      };

      ssh.on('error', (err) => {
        fail('connect', `SSH connection error: ${err.message}`);
      });

      ssh.on('ready', () => {
        ssh.shell({ term: 'vt100', rows: 200, cols: 200 }, (err, stream) => {
          if (err) {
            fail('connect', `failed to open shell: ${err.message}`);
            return;
          }
          this.stream = stream;
          stream.on('data', (d: Buffer) => this.onData(d));
          stream.on('error', () => this.teardown());
          stream.on('close', () => this.teardown());

          this.sendRaw('')
            .then((banner) => {
              if (!settled) {
                settled = true;
                resolve();
              }
            })
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : String(e);
              fail('connect', `no prompt after login: ${msg}`);
            });
        });
      });

      ssh.connect({
        host: this.cfg.host,
        port: this.cfg.port,
        username: this.cfg.username,
        password: this.cfg.password,
        readyTimeout: 20000,
      });
    });
  }

  /** Run one CLI command and return its cleaned output. READ-ONLY: the command
   *  must be on the read allowlist, otherwise it is rejected before reaching
   *  the router. Commands are serialized (mutex) so concurrent calls never
   *  interleave on the shared shell. */
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
    return this.enqueue(() => this.execCommand(command, opts));
  }

  private async execCommand(command: string, opts: RunCommandOptions): Promise<string> {
    const start = Date.now();
    await this.connect();
    this.pendingConnectMs = Date.now() - start;
    const stream = this.stream;
    if (!stream || stream.destroyed) {
      throw new VigorCommandError('closed', 'SSH stream is not available');
    }
    return this.sendRaw(command, opts);
  }

  /** Mark a confirmed write command as authorized for its next execution. */
  authorizeWrite(command: string): void {
    this.writeAuthorized.add(command);
  }

  /** Execute a write command that was previously confirmed and authorized.
   *  Writes are single-shot: authorization is consumed by this call. */
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
    return this.enqueue(() => this.execCommand(command, opts));
  }

  private sendRaw(command: string, opts: RunCommandOptions = {}): Promise<string> {
    const stream = this.stream;
    if (!stream || stream.destroyed) {
      return Promise.reject(new VigorCommandError('closed', 'SSH stream is not available'));
    }
    return new Promise((resolve, reject) => {
      const start = this.buf.length;
      const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
const waiter: Waiter = {
        stream,
        start,
        morePos: 0,
        pageKeys: 0,
        maxPages,
        sawMore: false,
        settleTimer: null,
        command,
        timer: setTimeout(() => {
          if (this.waiter === waiter) {
            const wasPaging = waiter.sawMore;
            this.waiter = null;
            this.resync(stream, wasPaging);
          }
          this.recordTiming(sendAt);
          reject(new VigorCommandError('timeout', `command timed out after ${timeoutMs}ms: ${command}`));
        }, timeoutMs),
        resolve: (value) => {
          this.recordTiming(sendAt);
          this.buf = '';
          resolve(value);
        },
        reject: (reason) => {
          this.recordTiming(sendAt);
          this.buf = '';
          reject(reason);
        },
      };
      this.waiter = waiter;
      stream.write(`${command}\r`);
      const sendAt = Date.now();
    });
  }

  private onData(chunk: Buffer): void {
    this.buf += chunk.toString('utf8');
    const w = this.waiter;
    if (!w) {
      if (this.buf.length > MAX_IDLE_BUF) {
        this.buf = this.buf.slice(-MAX_IDLE_BUF);
      }
      return;
    }
    const segment = this.buf.slice(w.start);
    // Respond to each NEW "--- MORE ---" marker exactly once. Checking the
    // whole segment would re-fire on every later chunk and flood the pager.
    const moreAt = segment.indexOf('--- MORE', w.morePos);
    if (moreAt !== -1) {
      w.morePos = moreAt + '--- MORE'.length;
      w.sawMore = true;
      if (w.pageKeys >= w.maxPages) {
        w.stream.write('q');
      } else {
        w.pageKeys += 1;
        w.stream.write(' ');
      }
    }
    if (PROMPT_RE.test(segment)) {
      // Absorb any trailing bytes before completing: the router may still be
      // flushing the final page, and leaking that into the next command would
      // corrupt its input (e.g. stray 'q'/' ' keystrokes).
      if (w.settleTimer !== null) clearTimeout(w.settleTimer);
      w.settleTimer = setTimeout(() => {
        if (this.waiter !== w) return;
        this.waiter = null;
        clearTimeout(w.timer);
        w.resolve(cleanOutput(segment, w.command));
      }, 150);
    }
  }

  private recordTiming(sendAt: number): void {
    this.lastTiming = { sendAt, recvAt: Date.now(), connectMs: this.pendingConnectMs };
    this.pendingConnectMs = 0;
  }

  /** After a timeout, resynchronize with the shell in the background. */
  private resync(stream: ClientChannel, wasPaging: boolean): void {
    this.waiter = null;
    stream.write(wasPaging ? 'q' : '\r');
    const probe = {
      stream,
      start: this.buf.length,
      morePos: 0,
      pageKeys: 0,
      maxPages: 1,
      sawMore: false,
      settleTimer: null,
      command: '',
      timer: setTimeout(() => {
        if (this.waiter === probe) this.waiter = null;
      }, 5000),
      resolve: () => {
        if (this.waiter === probe) {
          this.waiter = null;
          this.buf = '';
        }
      },
      reject: () => {
        if (this.waiter === probe) this.waiter = null;
      },
    };
    this.waiter = probe;
  }

  /** Send `exit` and close the SSH session. */
  async disconnect(): Promise<void> {
    this.closed = true;
    if (this.stream && !this.stream.destroyed) {
      try {
        this.stream.write('exit\r');
      } catch {
        /* ignore */
      }
    }
    this.teardown();
  }

  private teardown(): void {
    const w = this.waiter;
    this.waiter = null;
    if (w) {
      clearTimeout(w.timer);
      if (w.settleTimer !== null) clearTimeout(w.settleTimer);
      w.reject(new VigorCommandError('closed', 'SSH session closed'));
    }
    if (this.stream && !this.stream.destroyed) {
      this.stream.removeAllListeners();
      this.stream.end();
    }
    this.stream = null;
    if (this.ssh) {
      this.ssh.removeAllListeners();
      this.ssh.end();
    }
    this.ssh = null;
    this.buf = '';
  }
}