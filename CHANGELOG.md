# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-09-13

### Changed

- Single `EXPOSE_TOOLS` allowlist controls which tools are exposed to the AI:
  `readonly` (read tools only — recommended local), `all` (everything), or a
  comma-separated list. Replaces `VIGOR_ENABLED_TOOLS`.
- Unified E2E into one script (`tools/e2e.mjs`) used both locally and in CI:
  it only tests exposed tools; write tools are executed only against the fake
  DrayOS server (`E2E_FAKE=1`), never locally.
- Release target is `0.5.0`.

## [1.0.0] - 2026-09-13

### Added

- Full CLI command coverage as MCP tools: **217 commands / 42 families**
  (108 read + 109 write), generated from a single command registry
  (`src/commands/registry.ts`).
- Write tools with a **two-step confirm gate** (preview → single-use 60s token
  bound to the exact command).
- **Dangerous-write** classification requiring `acknowledge: true` and a
  lockout warning.
- **Auto `sys commit`** after successful confirmed writes (with `commit_status`
  audit; skipped for `skipCommit` commands).
- **SQLite logging** (`node:sqlite`): `requests` (all requests with tool/router
  timing) and `write_audit` (before/after snapshots, success, commit status).
  Secrets redacted.
- **Command mutex** — all commands serialized; concurrent tool calls never
  interleave.
- **Read-only mode** (`VIGOR_READ_ONLY=true` disables write tools).
- **Output cap** for read tools (`VIGOR_TOOL_OUTPUT_LIMIT`).
- **Hard blocklist** in the driver (`sys cfg default`, `sys halt`,
  `mngt rmtcfg enable`, `linux clean *`).
- CLI injection guards (`noControl()` / `safeText()` zod validators).
- `VigorClient` interface (`src/ssh/client.ts`) so a future 3912S SDK can
  replace the ssh2 implementation.
- 50 unit tests; E2E read tools verified one-by-one against a real router
  (fw 4.4.7_RC2); fake DrayOS SSH server for CI.
- Documentation: overview, architecture, user/admin/troubleshooting guides,
  command registry, logging schema, configuration, MCP integration,
  development/testing, SDK integration, and a self-contained Vigor 3912S
  reference (incl. original PDFs).

### Security

- Confirmed the live firmware is `4.4.7_RC2` (docs baseline is `4.3.5.1`) and
  re-verified all read commands against the device.
- DrayOS SSH: exec channel and key auth are unsupported; the client drives an
  interactive shell (password auth only).

## [0.2.0] - 2026-09-13

### Added

- Full command registry expansion (190 → 217 commands).
- Write confirm gate, SQLite logging, snapshot before/after.
- Safety layers: mutex, read-only switch, blocklist, injection guards.
- `VigorClient` interface refactor.

## [0.1.0] - 2026-09-13

### Added

- Initial read-only MCP server (8 tools) for the DrayTek Vigor 3912S over SSH.
- Live recon on the device (prompt, pager, verified commands, fw 4.4.7_RC2).