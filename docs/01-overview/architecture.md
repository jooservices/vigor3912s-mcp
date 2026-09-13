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
  │  write tools → preview/confirm → client.runWriteCommand()
  ▼
VigorClient interface (src/ssh/client.ts)
  │  implement by SshVigorClient (ssh2) — or a future 3912S SDK
  ▼
SSH interactive shell → DrayOS CLI (prompt `DrayTek> `, pager `--- MORE ---`)
```

## Command registry → tools

`src/commands/registry.ts` is the **single source of truth**: 217 commands
across 42 families. Each entry declares kind (`read` | `write`), args (zod),
safety flags (`dangerous`, `affectsNetwork`, `skipCommit`, `secretArgs`), and an
optional snapshot read + output formatter.

`src/commands/build.ts` generates one MCP tool per registry entry:

- **Read tools** run the (verified) read command and return its output
  (structured when a parser exists).
- **Write tools** are two-step: first call returns a preview + `confirm_token`;
  the confirm call (same args + token) executes. Dangerous writes also require
  `acknowledge: true`.

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

1. **Read allowlist** — `runCommand()` only permits registry read commands
   (derived `READ_EXACT` + `ip ping`/`ip tracert`/`ip6 ping`/`ip6 tracert`
   regexes). Anything else is refused before touching the router.
2. **Confirm gate** (`src/tools/confirm-gate.ts`) — single-use, 60s token bound
   to the exact rendered command; `expired`/`mismatch`/`used`/`invalid` are all
   rejected; pending intents are capped.
3. **Write authorization** — `runWriteCommand()` executes only a command
   previously `authorizeWrite()`d (single-shot); refused in read-only mode.
4. **Hard blocklist** — `sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
   `linux clean *` are refused even if the registry ever maps to them.
5. **Command mutex** — every command is serialized through a promise chain so
   concurrent tool calls never interleave on the shared shell.
6. **Injection guards** — `noControl()` / `safeText()` zod validators reject
   control characters and shell metacharacters in free-form args.
7. **Auto-commit** — after a successful confirmed write, `sys commit` persists
   the change (unless `skipCommit`), and the outcome is logged.
8. **Dangerous writes** — flagged commands require `acknowledge: true`.

## Logging (SQLite)

`src/db/log.ts` writes every request to `requests` and the write lifecycle
(including before/after snapshots, commit status, and timing) to
`write_audit`. See [`../03-reference/logging-schema.md`](../03-reference/logging-schema.md).

## Configuration

All knobs (host, credentials, read-only mode, tool filters, auto-commit, output
cap) come from environment variables — see
[`../03-reference/configuration.md`](../03-reference/configuration.md).