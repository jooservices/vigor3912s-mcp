import type {
  ExecOptions,
  ExecResult,
  SshClientOptions,
  SshErrorCode,
} from '@jooservices/ssh-client';

export class FakeSshClientError extends Error {
  constructor(
    readonly code: SshErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SshClientError';
  }
}

export class FakeSshClient {
  static instances: FakeSshClient[] = [];
  static script: Record<string, string> = {};
  static errors: Record<string, FakeSshClientError> = {};
  static connectError: FakeSshClientError | null = null;

  readonly written: string[] = [];
  connected = false;

  constructor(readonly options: SshClientOptions) {
    FakeSshClient.instances.push(this);
  }

  async connect(): Promise<void> {
    if (FakeSshClient.connectError) {
      throw FakeSshClient.connectError;
    }
    this.connected = true;
  }

  async exec(command: string, _options?: ExecOptions): Promise<ExecResult> {
    this.written.push(command);
    const error = FakeSshClient.errors[command];
    if (error) {
      throw error;
    }
    const sendAt = Date.now();
    const stdout = FakeSshClient.script[command] ?? '';
    const recvAt = Date.now();
    return { stdout, durationMs: recvAt - sendAt, sendAt, recvAt, connectMs: 0 };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  getStream(): { written: string[] } {
    return { written: this.written };
  }
}
