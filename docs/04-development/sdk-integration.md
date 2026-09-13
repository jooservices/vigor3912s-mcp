# SDK integration

The tool layer depends on the **`VigorClient` interface**
(`src/ssh/client.ts`), not on any SSH implementation. The current
implementation is `SshVigorClient` (ssh2). A future **3912S SDK** can replace
it without changing the registry, tools, confirm gate, logging, or tests.

## The interface

```ts
interface VigorClient {
  connect(): Promise<void>;
  runCommand(command: string, opts?: RunCommandOptions): Promise<string>;
  authorizeWrite(command: string): void;
  runWriteCommand(command: string, opts?: RunCommandOptions): Promise<string>;
  disconnect(): Promise<void>;
  readonly lastCommandTiming: CommandTiming | null;
}
```

## Contract the SDK must honor

1. **Read-only `runCommand`** — the SDK must refuse anything that is not a
   registry read command (or the caller's tools will only ever pass read
   commands anyway).
2. **Write safety** — `runWriteCommand` executes only commands previously given
   to `authorizeWrite`, and each authorization is **single-shot** (consumed by
   the next execution).
3. **DrayOS shell behavior** — an implementation must drive an **interactive
   shell** (DrayOS has no exec channel), handle the `DrayTek> ` prompt and the
   `--- MORE ---` pager, and support lazy connect / reconnect.
4. **Timing** — populate `lastCommandTiming` (`sendAt`, `recvAt`, `connectMs`)
   so the logging layer records router-level latency.
5. **Read-only mode / blocklist** — honor `readOnly` and the hard blocklist
   (`sys cfg default`, `sys halt`, `mngt rmtcfg enable`, `linux clean *`).

## Swapping it in

In `src/index.ts` `buildServer()`:

```ts
const client: VigorClient = new SshVigorClient(config);
// →  const client: VigorClient = new YourSdkClient(config);
```

Everything downstream (registry, tools, confirm gate, SQLite logging, E2E)
keeps working because they only see the interface.

## Recommended adapter shape

```ts
class SdkVigorClient implements VigorClient {
  constructor(private readonly cfg: Pick<VigorConfig, 'host'|'port'|'username'|'password'|'readOnly'>) {}
  // delegate to the SDK; translate SDK errors into VigorCommandError codes:
  // connect | auth | timeout | closed | invalid | unauthorized
}
```

Map SDK errors to the `VigorErrorCode` union so the logging and tool layers
report consistent error codes.