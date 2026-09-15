# SDK integration

End-state wire path:

```text
MCP tools / confirm / audit
  → SdkVigorClient (MCP policy façade)
      → @jooservices/vigor3912s-sdk (execute / invoke)
          → SshClientTransport (SDK Transport adapter)
              → @jooservices/ssh-client
                  → router
```

## Responsibilities

| Layer | Owns |
| --- | --- |
| MCP | Curated tool IDs (~217), confirm gate, human confirm UX, SQLite audit, env/config, hard blocklist + read allowlist policy |
| SDK | DrayOS framing, typed operations, parsers, capability manifest, `execute` / `invoke` |
| Transport adapter (`SshClientTransport`) | Map SDK `Transport.send(frame)` → ssh-client interactive shell |
| ssh-client | Generic SSH only (prompt/pager/session) — no DrayOS domain |

The SDK does **not** authorize writes. After MCP confirm, writes call
`authorizeWrite` then `runWriteCommand`, which dispatch through
`Vigor3912SClient.execute` (typed `invoke` mapping is incremental).

## `VigorClient` (MCP policy façade)

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

`SdkVigorClient` implements this by composing MCP policy with the SDK client.

## Contract

1. **Read-only `runCommand`** — MCP allowlist (curated catalog) + hard blocklist.
2. **Write safety** — confirm gate, then single-shot `authorizeWrite` /
   `runWriteCommand`; honor `readOnly`.
3. **DrayOS shell** — ssh-client drives the interactive shell; SDK frames one
   command per exchange (no chaining).
4. **Timing** — transport records `sendAt` / `recvAt` / `connectMs` for audit.
5. **No ChangePlan in SDK** — confirmation stays in MCP only.

## Confirm policy (MCP only)

Layer 1 — session: tool `kind` `read` | `write` (+ config `readOnly`).

Layer 2 — confirm tier (`auto` | `confirm` | `dual`):

| Tier | Meaning |
| --- | --- |
| `auto` | No confirm (all reads; rare writes if explicitly marked) |
| `confirm` | Preview + single-use token / human confirm (default writes) |
| `dual` | Confirm + `acknowledge: true` (lockout / reboot / WAN down, …) |

Owned in `src/commands/write-policy.ts`. SDK `classification` stays metadata.

`src/commands/registry/**` remains the curated MCP tool surface (stable tool
IDs, zod args, render → CLI projection for tools not yet on typed `invoke`
with mapped inputs). Zero-arg tools that match an SDK void operation go through
`invoke()` automatically; parameterized tools still use `execute()` after MCP
policy. Duplicate output parsers were removed.
