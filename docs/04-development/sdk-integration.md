# SDK integration

## Rebuild siblings

The MCP package links the sibling packages from `../ssh-client` and
`../vigor3912s-sdk`; build the pinned releases before installing or running
MCP so each sibling's `dist/` matches its source:

```bash
cd projects/ssh-client && git checkout v1.2.0 && npm ci && npm run build
cd ../vigor3912s-sdk && git checkout v2.0.0 && npm ci && npm run build
cd ../vigor3912s-mcp && npm ci
```

To verify the ssh-client build output without changing `dist/`:

```bash
cd projects/ssh-client
npx tsc -p tsconfig.json --outDir /tmp/ssh-client-dist
diff -rq /tmp/ssh-client-dist dist | grep -v .map
```

No output from the final command means the generated JavaScript matches. The
CI workflows default to the same sibling tags and verify package versions.

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
| MCP | Curated + schema-generated SDK tools (666: 220 read / 446 write, 43 families), Ed25519 confirm gate, SQLite audit, env/config, hard blocklist + read allowlist policy |
| SDK | DrayOS framing, typed operations, parsers, capability manifest, `execute` / `invoke` |
| Transport adapter (`SshClientTransport`) | Map SDK `Transport.send(frame)` → ssh-client interactive shell |
| ssh-client | Generic SSH only (prompt/pager/session) — no DrayOS domain |

The SDK does **not** authorize writes. After MCP confirm, SDK-backed writes
call `authorizeWrite` and `runWriteOperation`, dispatching through
`Vigor3912SClient.invoke`; raw `runWriteCommand` / `execute` remains only for
the three reviewed OD-1 compatibility tools without a supported typed
operation.

## `VigorClient` (MCP policy façade)

```ts
interface VigorClient {
  connect(): Promise<void>;
  runCommand(command: string, opts?: RunCommandOptions): Promise<string>;
  runOperation(manifestId: string, input: unknown, opts?: RunCommandOptions): Promise<string>;
  authorizeWrite(command: string): void;
  runWriteCommand(command: string, opts?: RunCommandOptions): Promise<string>;
  runWriteOperation(manifestId: string, input: unknown, opts?: RunCommandOptions): Promise<string>;
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
| `confirm` | Preview + single-use Ed25519 signature / human approval (default writes) |
| `dual` | Confirm + `acknowledge: true` (lockout / reboot / WAN down, …) |

Owned in `src/commands/write-policy.ts`. SDK `classification` stays metadata.

`src/commands/registry/**` remains the curated MCP tool surface (stable tool
IDs, zod args, and SDK-derived render projections). Every SDK-backed tool uses
`invoke()` with schema validation; only the three reviewed OD-1 compatibility
tools use raw `execute()`.

## Typed invoke everywhere: schema-driven tool generation

`@jooservices/vigor3912s-sdk/schemas` exports `inputSchemaFor(manifestId)`, a
hand-written JSON Schema for every implemented `TypedOperation`'s input
(`null` for void operations). `src/sdk/schema-to-zod.ts`
(`jsonSchemaToZod(schema)`) converts one into:

- `shape` — a flattened `ZodRawShape` for `server.tool(...)` (the MCP tool's
  raw args).
- `full` — a strict `ZodType` that validates the *exact* typed input passed
  to `sdk.invoke()`.
- `wrap: 'input'` (when present) — the schema's top-level shape cannot be
  represented as MCP raw args directly (a bare scalar/array, or a `oneOf`
  with a non-object branch, e.g. `cli.sys.autoreboot`'s
  `oneOf: [{const:'on'}, {const:'off'}, {type:'object', ...}]`); the whole
  typed value is carried under a single `input` arg and unwrapped before
  `sdk.invoke()`.

For a top-level `oneOf` of objects, the converter auto-detects the
discriminator: a property that is `const` in *every* branch, by any name
(not hardcoded to `action` — e.g. `option` for `cli.ldap.set`, `kind` for
`cli.mngt.certimport`/`cli.port`, `mode` for `cli.vlan.sysvid`, `target` for
`cli.vlan.tagged`). When found, `shape` flattens to that discriminator as a
`z.enum` plus every other property (optional, unioned across branches when
its type differs), and `full` is a `z.discriminatedUnion`. When no single
property is `const` in every branch (e.g. `cli.switch.clear`,
`cli.sys.board`), `shape` flattens all branch properties as optional and
`full` falls back to a plain `z.union` of the (strict) branch schemas.

The `S(id, family, manifestId, desc, opts?)` builder
(`src/commands/registry/builders.ts`) uses this automatically: `args`,
`toInput` (handling the `wrap`/unwrap and the void `{} → undefined` case),
and `validate` (the `full` zod parse, throwing `VigorCommandError('invalid',
...)` with the zod issues on failure) are all derived from
`inputSchemaFor(manifestId)` unless a caller passes its own `args`/`toInput`
(a curated tool's legacy arg shape) — `validate` still runs against the
*mapped* input in that case, so curated migrations keep SDK-schema
validation.

`src/commands/registry/families/sdk-generated.ts` (`buildSdkGeneratedFamily`)
registers one `S(...)` tool for every implemented SDK operation not already
bound to a curated tool's `cmd.sdk.manifestId` — not just void operations.
Coverage is by `manifestId`, not by rendered CLI string: a curated
parameterized tool that happens to cover the same operation (not yet linked
onto typed invoke) does not exclude the generated duplicate; once a later
migration links the curated tool's `cmd.sdk`, the generated duplicate
disappears on its own. Destructive-classified operations get
`registerExtraWritePolicy(id, { confirm: 'dual' })`, same as before.

### Census gates (`src/commands/registry/sdk-census.test.ts`)

- Every implemented SDK operation is bound to a tool's `cmd.sdk.manifestId`,
  or listed in the reviewed, currently empty, `SDK_TOOL_EXCLUSIONS`
  (`src/commands/registry/sdk-fixtures.ts`).
- Every tool without `cmd.sdk` (raw `execute()`) is exactly the reviewed
  `RAW_EXECUTE_ALLOWLIST` of three OD-1 compatibility tools.
- A sample of generated tools' `full` zod schema accepts a schema-valid
  input and rejects an invalid one (object, action-`oneOf`, each of the
  8 non-`action` `oneOf` operations, a void operation, an array field).
- Read tools only bind to SDK read-classified operations; tools bound to a
  destructive-classified operation are dual-confirm.

`src/commands/registry/tool-ids.test.ts` freezes the tool-id inventory as two
lists: the pre-existing baseline (must remain a subset — no id ever
removed/renamed) and the ids this generalization added (reviewable as data;
shrinks in the same commit a later migration links a curated tool's
`cmd.sdk`, since that removes the corresponding generated duplicate).
