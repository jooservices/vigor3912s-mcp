# Architecture

```
opencode / ChatGPT / any MCP client
        │ stdio (JSON-RPC)
        ▼
MCP server (src/index.ts)
  │  buildServer(): one VigorClient + ConfirmGate + LogStore, registerAllTools()
  ▼
Tool layer (src/commands/build.ts)
  │  read tools → client.runCommand()
  │  write tools → executeWrite() (confirm → snapshot → run → commit → audit)
  ▼
VigorClient interface (src/ssh/client.ts)
  │  implement by SshVigorClient (ssh2) — or a future 3912S SDK
  ▼
SSH interactive shell → DrayOS CLI (prompt `DrayTek> `, pager `--- MORE ---`)
```

## Command registry → tools

`src/commands/registry/` is the **CLI catalog** (217 commands / 42 families):
kind, zod args, render, optional output formatter. Safety metadata lives in
`src/commands/write-policy.ts` and is merged by `allCommands()`.

`src/commands/build.ts` registers one MCP tool per entry; write orchestration
is in `src/commands/write-executor.ts`:

- **Read tools** run the (verified) read command and return its output
  (structured when a parser exists; formatters receive args).
- **Write tools** are two-step: first call returns a preview + `confirm_token`
  (or `confirmation_id` in human-confirm mode); the confirm call executes.
  Dangerous writes also require `acknowledge: true`.

## Client interface (SDK-ready)

`src/ssh/client.ts` defines the `VigorClient` interface the tool layer depends
on:

```ts
interface VigorClient {
  connect(): Promise<void>;
  runCommand(cmd: string, opts?): Promise<string>;      // read only
  authorizeWrite(cmd: string): void;                    // after confirm
  runWriteCommand(cmd: string, opts?): Promise<string>; // single-shot write
  disconnect(): Promise<void>;
  readonly lastCommandTiming: CommandTiming | null;     // for logging
}
```

The current implementation is `SshVigorClient` (ssh2). A future 3912S SDK can
replace it by implementing the same interface and swapping one line in
`buildServer()`. See [`../04-development/sdk-integration.md`](../04-development/sdk-integration.md).

## Safety layers (in depth)

1. **SSH host-key pin** — `VIGOR_SSH_HOST_FINGERPRINT` verified on connect
   unless `VIGOR_SSH_INSECURE_SKIP_VERIFY=true`.
2. **Read allowlist** — `runCommand()` uses `isAllowedReadCommand()` from
   `src/commands/read-allowlist.ts` (registry + Zod host schemas). Anything
   else is refused before touching the router.
3. **Confirm gate** (`src/tools/confirm-gate.ts`) — single-use, 60s token bound
   to the exact rendered command; human-confirm supports timing-safe passphrase
   checks with rate limiting.
4. **Write authorization** — `runWriteCommand()` executes only a command
   previously `authorizeWrite()`d (single-shot); refused in read-only mode.
5. **Hard blocklist** — `sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
   `linux clean *` are refused even if the registry ever maps to them.
6. **Command mutex** — every command is serialized through a promise chain so
   concurrent tool calls never interleave on the shared shell.
7. **Injection guards** — shared validators in `src/commands/validators.ts`.
8. **Auto-commit** — after a successful confirmed write, `sys commit` persists
   the change (unless `skipCommit`), and the outcome is logged.
9. **Dangerous writes** — policy-flagged commands require `acknowledge: true`.

## Logging (SQLite)

`src/db/log.ts` writes every request to `requests` and the write lifecycle
(including before/after snapshots, commit status, and timing) to
`write_audit`. See [`../03-reference/logging-schema.md`](../03-reference/logging-schema.md).

## Configuration

All knobs (host, credentials, read-only mode, tool filters, auto-commit, output
cap) come from environment variables — see
[`../03-reference/configuration.md`](../03-reference/configuration.md).