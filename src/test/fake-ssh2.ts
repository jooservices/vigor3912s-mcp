/**
 * Shared fake ssh2 client for unit tests: a scripted router shell that echoes
 * each command, returns canned output, and ends with the `DrayTek> ` prompt.
 * Returns `undefined` for unscripted commands (simulates no response).
 */
export class FakeStream {
  destroyed = false;
  written: string[] = [];
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  constructor(
    private readonly script: Record<string, string | string[]>,
    private readonly delayMs = 0,
  ) {}

  on(event: string, fn: (...args: unknown[]) => void): this {
    (this.listeners[event] ??= []).push(fn);
    return this;
  }
  removeAllListeners(event?: string): this {
    if (event) this.listeners[event] = [];
    else this.listeners = {};
    return this;
  }
  private emit(event: string, ...args: unknown[]): boolean {
    for (const fn of [...(this.listeners[event] ?? [])]) fn(...args);
    return true;
  }
  write(data: string): boolean {
    this.written.push(data);
    const cmd = data.replace(/\r$/, '');
    const resp = this.script[cmd];
    if (resp === undefined) return true;
    const emit = () => {
      const body = Array.isArray(resp) ? resp : [resp];
      for (const part of body) {
        this.emit('data', Buffer.from(`\r\n${cmd}\r\n${part}\r\nDrayTek> `));
      }
    };
    if (this.delayMs > 0) setTimeout(emit, this.delayMs);
    else setImmediate(emit);
    return true;
  }
  end(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit('close');
  }
  destroy(): void {
    this.destroyed = true;
  }
}

export class FakeClient {
  static instances: FakeClient[] = [];
  static script: Record<string, string | string[]> = {};
  static delayMs = 0;
  private stream: FakeStream | null = null;
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  constructor() {
    FakeClient.instances.push(this);
  }
  on(event: string, fn: (...args: unknown[]) => void): this {
    (this.listeners[event] ??= []).push(fn);
    return this;
  }
  removeAllListeners(event?: string): this {
    if (event) this.listeners[event] = [];
    else this.listeners = {};
    return this;
  }
  private emit(event: string, ...args: unknown[]): boolean {
    for (const fn of [...(this.listeners[event] ?? [])]) fn(...args);
    return true;
  }
  connect(): void {
    setImmediate(() => this.emit('ready'));
  }
  shell(_opts: unknown, cb: (err: Error | undefined, stream: unknown) => void): void {
    this.stream = new FakeStream(FakeClient.script, FakeClient.delayMs);
    setImmediate(() => cb(undefined, this.stream));
  }
  getStream(): FakeStream | null {
    return this.stream;
  }
  end(): void {
    if (this.stream) this.stream.end();
  }
}