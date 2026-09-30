# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Typed invoke everywhere, schema-driven**: `jsonSchemaToZod` now converts
  any implemented SDK operation's input schema (not just top-level
  `action`-discriminated `oneOf`) — auto-detects a common `const`
  discriminator by any property name for object `oneOf`s, falls back to a
  plain `z.union` when branches share no discriminator, and wraps a
  non-object top-level shape (mixed literal/object `oneOf`, or a bare
  scalar/array) under a single `input` arg for MCP tool args.
- The `S(...)` command builder now derives a tool's `args`, `toInput`, and
  `validate` from the SDK's published input schema
  (`inputSchemaFor(manifestId)`) automatically; callers may still override
  `args`/`toInput` (e.g. a curated legacy arg shape) and still get SDK
  schema validation on the mapped input.
- `families/sdk-generated.ts` (was `families/sdk-void.ts`) now registers a
  tool for **every** implemented SDK operation not yet bound to a curated
  tool's `cmd.sdk.manifestId` (previously only zero-arg/void operations).
- All curated migration batches now execute through typed `invoke()` with
  schema validation. The raw escape hatch is limited to the three reviewed
  OD-1 compatibility tools.
- `src/commands/registry/sdk-census.test.ts` — acceptance gate: every
  implemented SDK operation is bound to a tool (or a reviewed, currently
  empty, `SDK_TOOL_EXCLUSIONS`); every raw (non-SDK) tool is exactly the
  reviewed `RAW_EXECUTE_ALLOWLIST` (three OD-1 compatibility tools); a sample
  of generated tools' `full` zod schema accepts a valid
  input and rejects an invalid one; read tools only bind to SDK
  read-classified operations; destructive-classified tools are dual-confirm.

### Changed

- Tool surface: **666 tools / 43 families** (220 read + 446 write), with all
  640 local SDK operations reachable, 663 SDK-backed tools, and three reviewed
  OD-1 raw compatibility tools. The count reflects the local, unreleased SDK
  schema/operation branch used by this integration.
- Updated the MCP lockfile to `@jooservices/ssh-client` `1.1.0`; command-timeout
  reconnect behavior is preserved through the transport adapter.
- Local real-router E2E remains read-only; CI E2E runs the full tool surface,
  including confirmed writes, only against the simulated DrayOS server.

### Security

- Typed write execution rejects read-classified operations, keeps single-use
  authorization, and redacts credentials from generated SDK-tool previews and
  audit logs.

## [1.0.0] - 2026-09-15

### Added

- Execution path on **`@jooservices/vigor3912s-sdk`** + **`@jooservices/ssh-client`**
  (`SdkVigorClient`, `SshClientTransport`); in-tree ssh2 driver removed.
- **Ed25519 write approval** (`VIGOR_APPROVE_PUBKEY`, `tools/approve-keygen.mjs`,
  `tools/approve.mjs`) replacing passphrase/token confirmation.
- **`sdk_void` family** — auto-registers remaining zero-arg SDK TypedOperations
  not already curated (~81 tools).
- Structured MCP args for high-traffic families (sys/mngt/wan/internet/csm/ipf/
  swm/qos/ldap/hsportal/tacacsplus and related), aligned with SDK/UG CLI forms.
- Live helpers for safe WAN7 ISP Name rename/revert
  (`tools/e2e_wan7_ispname_*.mjs`).
- CI sibling clone of `ssh-client` and `vigor3912s-sdk` for `file:` deps.

### Changed

- Tool surface: **302 tools / 43 families** (150 read + 152 write), including
  curated registry + `sdk_void`.
- Confirm tier docs and UX describe signed approval (`confirm` / `dual`).
- Fake DrayOS E2E tolerates parameterized renders; write execute success is
  `status === 'done'` only.

### Security

- Host-key pin remains required for live routers.
- HA `args` tokens reject embedded whitespace; secretArgs updated for structured
  credential fields.

## [0.6.0] - 2026-09-14

### Added

- **SSH host-key pinning** (`VIGOR_SSH_HOST_FINGERPRINT`, OpenSSH `SHA256:…` or
  hex). Required unless `VIGOR_SSH_INSECURE_SKIP_VERIFY=true` (tests /
  simulated DrayOS only).
- Shared **Zod validators** (`src/commands/validators.ts`) and contiguous
  IPv4 netmask checks for `ip_nmask` / route masks.
- **Write policy map** (`src/commands/write-policy.ts`) separate from the CLI
  catalog — expanded `dangerous` / `secretArgs` / `snapshotRead` coverage.
- **Write executor** (`src/commands/write-executor.ts`) for confirm → snapshot
  → execute → commit → audit outside the MCP adapter.
- Registry-derived **read allowlist** (`src/commands/read-allowlist.ts`) shared
  with the SSH driver (no parallel ping/tracert regexes).
- Idle SSH buffer cap; timing-safe denial paths; `LogStore.query` limited to a
  single `SELECT`.

### Changed

- Command registry split into per-family modules under
  `src/commands/registry/`.
- Read formatters receive validated args (`format(raw, args)`); `ip_ping`
  reports the requested target.
- Dev dependency **vitest** upgraded to v5 (`npm audit` clean).

### Security

- Host-key verification fails closed by default (MITM defense on LAN).
- Broader redaction of free-form credential params (`user_*`, `ldap_*`,
  `tacacsplus_set`, VPN setup, …).
- Documented live-router ops and accepted risks in `SECURITY.md`.

## [0.5.0] - 2026-09-13

### Changed

- Single `EXPOSE_TOOLS` allowlist controls which tools are exposed to the AI:
  `readonly` (read tools only — recommended local), `all` (everything), or a
  comma-separated list. Replaces `VIGOR_ENABLED_TOOLS`.
- Unified E2E into one script (`tools/e2e.mjs`) used both locally and in CI:
  it only tests exposed tools; write tools are executed only against the fake
  DrayOS server (`E2E_FAKE=1`), never locally.
- Release target is `0.5.0`.

## [0.2.0] - 2026-09-13

### Added

- Full CLI command coverage as MCP tools (read + write families) from a single
  command registry.
- Write tools with a **two-step confirm gate** (preview → approval → execute).
- **Dangerous-write** classification requiring `acknowledge: true` and a
  lockout warning.
- **Auto `sys commit`** after successful confirmed writes (with `commit_status`
  audit; skipped for `skipCommit` commands).
- **SQLite logging** (`node:sqlite`): `requests` and `write_audit`. Secrets
  redacted.
- **Command mutex** — all commands serialized; concurrent tool calls never
  interleave.
- **Read-only mode** (`VIGOR_READ_ONLY=true` disables write tools).
- **Output cap** for read tools (`VIGOR_TOOL_OUTPUT_LIMIT`).
- **Hard blocklist** in the driver (`sys cfg default`, `sys halt`,
  `mngt rmtcfg enable`, `linux clean *`).
- CLI injection guards (`noControl()` / `safeText()` zod validators).
- `VigorClient` interface (`src/ssh/client.ts`) for pluggable transports.
- Unit tests; E2E against a real router (fw 4.4.7_RC2); fake DrayOS SSH server
  for CI.
- Documentation set under `docs/`.

### Security

- Confirmed the live firmware is `4.4.7_RC2` and re-verified read commands.
- DrayOS SSH: exec channel and key auth are unsupported; interactive shell
  (password auth only).

## [0.1.0] - 2026-09-13

### Added

- Initial read-only MCP server (8 tools) for the DrayTek Vigor 3912S over SSH.
- Live recon on the device (prompt, pager, verified commands, fw 4.4.7_RC2).
