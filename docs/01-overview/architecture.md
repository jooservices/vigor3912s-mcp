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
  │  write tools → executeWrite() (confirm tiers → snapshot → run → commit → audit)
  ▼
SdkVigorClient (src/ssh/sdk-vigor-client.ts)
  │  allowlist / blocklist / authorizeWrite
  │  invoke() for mapped zero-arg SDK ops, else execute()
  ▼
SshClientTransport → @jooservices/ssh-client → DrayOS shell (`DrayTek> `)
```

## Command registry → tools

`src/commands/registry/` is the **CLI catalog** (302 tools / 43 families):
kind, zod args, render, optional output formatter. Curated families are
hand-shaped; `sdk_void` auto-adds remaining zero-arg SDK TypedOperations.
Safety metadata lives in `src/commands/write-policy.ts` and is merged by
`allCommands()`.

`src/commands/build.ts` registers one MCP tool per entry; write orchestration
is in `src/commands/write-executor.ts`:

- **Read tools** run the (verified) read command and return its output
  (structured when a formatter exists; formatters receive args).
- **Write tools** are two-step: first call returns a redacted preview +
  `confirmation_id` / `sign_payload`; the confirm call requires an Ed25519
  `signature` (and `acknowledge: true` for dual-tier writes).

## Client interface

`src/ssh/client.ts` defines the `VigorClient` interface the tool layer depends
on. The production implementation is `SdkVigorClient`, which wraps
`@jooservices/vigor3912s-sdk` and talks to the router through
`SshClientTransport` (`@jooservices/ssh-client`).

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

See [`../04-development/sdk-integration.md`](../04-development/sdk-integration.md).

## Safety layers (in depth)

1. **SSH host-key pin** — `VIGOR_SSH_HOST_FINGERPRINT` verified on connect
   unless `VIGOR_SSH_INSECURE_SKIP_VERIFY=true`.
2. **Read allowlist** — `runCommand()` uses `isAllowedReadCommand()` from
   `src/commands/read-allowlist.ts` (registry + Zod host/enum schemas).
3. **Confirm gate** (`src/tools/confirm-gate.ts`) — single-use, 60s intent bound
   to the command digest; Ed25519 verify against `VIGOR_APPROVE_PUBKEY`.
4. **Write authorization** — `runWriteCommand()` executes only a command
   previously `authorizeWrite()`d (single-shot); refused in read-only mode.
5. **Hard blocklist** — `sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
   `linux clean *` are refused even if the registry ever maps to them.
6. **Command mutex** — every command is serialized through a promise chain so
   concurrent tool calls never interleave on the shared shell.
7. **Injection guards** — shared validators in `src/commands/validators.ts`.
8. **Auto-commit** — after a successful confirmed write, `sys commit` persists
   the change (unless `skipCommit`), and the outcome is logged.
9. **Dangerous / dual writes** — policy-flagged commands require `acknowledge: true`.

## Logging (SQLite)

`src/db/log.ts` writes every request to `requests` and the write lifecycle
(including before/after snapshots, commit status, and timing) to
`write_audit`. See [`../03-reference/logging-schema.md`](../03-reference/logging-schema.md).
