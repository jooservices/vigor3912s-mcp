# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2026-09-30

### Fixed

- `wan_status` and other paged reads no longer fail with `idle timeout after
  5000ms with no output`. ssh-client 1.3.0 answers the real DrayOS pager
  marker; CI and E2E now build against ssh-client `v1.3.0`.
- The default read tool timeout is 20 seconds (was 15). The budget also covers
  the SSH connect on the first call, so a first `wan_status` over a
  high-latency link no longer exceeds it.

## [2.0.0] - 2026-09-29

### Breaking

- Typed tool argument schemas and invocation are now derived from SDK operation
  schemas. Clients relying on earlier untyped argument shapes must use the
  schemas advertised by each tool.
- When unset or empty, `EXPOSE_TOOLS` now registers only the 220 read tools.
  Add `EXPOSE_TOOLS=all` to `.env` to expose the full 666-tool catalog.
- Secret values in write previews use named `<redacted:FIELD>` placeholders;
  approval requires interactive re-entry and exact command-digest validation.
- `tools/approve.mjs --payload` now requires `--blind` and prints a warning.
- The generated SDK tool family is now named `sdk_generated` (previously
  `sdk_void`). Consumers matching the old family name must update.

### Added

- SDK-derived tool schemas now cover implemented operations, including
  generated tools, and every SDK invocation validates against its typed input.
  The raw command path remains limited to three reviewed compatibility tools.
- The command registry provides 666 tools in 43 families (220 read / 446
  write), including generated tools for uncovered SDK operations.
- Generated write tools inherit secret-field classification from SDK schemas;
  sensitive read output and snapshots are excluded from persisted logs.

### Fixed

- Invalid SDK write input is rejected before approval intent creation; the
  preview and invoked command are built from the same validated input.
- Write authorization is single-use even after a failed attempt, and forbidden
  command matching handles case and whitespace consistently.
- SDK sessions recover after output-limit and abort failures. MCP cancellation
  reaches reads and stops writes before dispatch; an already-sent write is
  completed and audited.
- Logging now records render failures, links audits to their exact request,
  writes pending intents atomically, and resolves data paths from the package
  root. `VIGOR_LOG_DB=:memory:` disables pending-file persistence.
- Registry lookups and SQLite insert statements are reused. Read timeouts are
  defined per tool; traceroute and generated ping/traceroute operations use
  60 seconds.
- Coverage now includes the changed registry and runtime paths while retaining
  the 90% threshold on every metric.

### Security

- **S1:** SDK schema string fields identified as secrets are redacted from
  previews, pending files, request arguments, audit commands and stored output.
- **S2:** redacted approvals prompt for hidden re-entry and sign only when the
  reconstructed command matches the requested digest; blind payload signing
  requires an explicit flag and warning.
- **S3–S4:** write authorization is one-shot, and normalized forbidden commands
  cannot be bypassed with case, whitespace or suffix variations.
- **S5:** sensitive read output and sensitive before/after snapshots are not
  persisted; the live tool response remains available to the caller.
- **S6:** invalid or non-Ed25519 approval keys fail during configuration
  loading. SSH host fingerprints are validated when the transport is created.
- Typed write execution rejects read-classified SDK operations.

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

[Unreleased]: https://github.com/jooservices/vigor3912s-mcp/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/jooservices/vigor3912s-mcp/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/jooservices/vigor3912s-mcp/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/jooservices/vigor3912s-mcp/compare/v0.6.0...v1.0.0
[0.6.0]: https://github.com/jooservices/vigor3912s-mcp/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/jooservices/vigor3912s-mcp/releases/tag/v0.5.0
