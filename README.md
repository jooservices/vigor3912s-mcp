# jooservices/vigor3912s-mcp

[![CI](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/ci.yml)
[![E2E](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/e2e.yml/badge.svg?branch=develop)](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/e2e.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/jooservices/vigor3912s-mcp/badge)](https://securityscorecards.dev/viewer/?uri=github.com/jooservices/vigor3912s-mcp)
[![Node](https://img.shields.io/badge/Node-24%2B-blue.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/jooservices/vigor3912s-mcp?display_name=tag&label=Release)](https://github.com/jooservices/vigor3912s-mcp/releases)

MCP server (Model Context Protocol) for a DrayTek Vigor 3912S router (DrayOS)
over SSH.

Covers the **full CLI command set** (217 commands across 42 families) as MCP
tools:

- **Read commands (108)** run freely — verified view/status/display commands,
  all 108 verified against the real router (fw 4.4.7_RC2).
- **Write commands (109)** require a two-step confirm gate (preview → single-use
  60s token) before execution. Lockout-prone writes also need
  `acknowledge: true`.

## Status

`v0.6.0` — local stdio MCP server for trusted LAN use; hosted on
[jooservices/vigor3912s-mcp](https://github.com/jooservices/vigor3912s-mcp).

Local deployments should expose only read tools by default
(`EXPOSE_TOOLS=readonly`). Write tools are exercised in CI against a simulated
DrayOS server (`npm run e2e:testing`, `EXPOSE_TOOLS=all`).

## Documentation

- [Overview](docs/01-overview/overview.md) · [Architecture](docs/01-overview/architecture.md)
- [User guide](docs/02-guides/user-guide.md) · [Admin guide](docs/02-guides/admin-guide.md) · [Troubleshooting](docs/02-guides/troubleshooting.md)
- [Command registry](docs/03-reference/commands.md) · [Logging schema](docs/03-reference/logging-schema.md) · [Configuration](docs/03-reference/configuration.md) · [MCP integration](docs/03-reference/mcp-integration.md)
- [Development](docs/04-development/development.md) · [Testing](docs/04-development/testing.md) · [SDK integration](docs/04-development/sdk-integration.md)
- [Vigor 3912S reference](docs/05-3912s-reference/README.md) (self-contained, incl. original PDFs)
- [CHANGELOG](CHANGELOG.md) · [SECURITY](SECURITY.md)

## Safety model

- **SSH host-key pin** — set `VIGOR_SSH_HOST_FINGERPRINT` (required). Use
  `VIGOR_SSH_INSECURE_SKIP_VERIFY=true` only for tests / simulated DrayOS.
- **Read tools** — unit tests (mocked shell) **and** read-only E2E
  (`npm run e2e`); E2E never calls a write tool on a real router.
- **Write tools** — unit tests with a mocked shell; CI E2E against simulated
  DrayOS only. A write executes only after confirm (token or human code).
- **Confirm gate** — single-use 60s token bound to the exact rendered command.
- **Dangerous writes** — additionally require `acknowledge: true` and return a
  lockout warning (policy in `src/commands/write-policy.ts`).
- **Human confirm (optional)** — `VIGOR_HUMAN_CONFIRM=true` hides the token;
  approve with `confirmation_id` + `VIGOR_CONFIRM_PASSPHRASE`.
- **Auto-commit** — after a successful confirmed write, `sys commit` runs
  (`VIGOR_AUTO_COMMIT`; skipped for `skipCommit`). Outcome in
  `write_audit.commit_status`.
- **Command mutex** — commands are serialized on the shared SSH shell.
- **Hard blocklist** — `sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
  `linux clean *` refused regardless of the registry.
- **Tool filters** — `EXPOSE_TOOLS` / `VIGOR_DISABLED_TOOLS`; read output capped
  via `VIGOR_TOOL_OUTPUT_LIMIT`.
- **Injection guards** — shared Zod validators (`safeText` / `noControl` /
  `ipv4Mask`, …).
- Credentials live only in `.env` (chmod 600, gitignored); secret args are
  redacted in SQLite logs.

## Architecture

```
opencode ←stdio→ MCP server (Node 24 + TypeScript)
                        │ ssh2 interactive shell channel
                        ▼
                DrayOS CLI @ <VIGOR_HOST>  (prompt `DrayTek> `)
```

| Layer | Role |
| --- | --- |
| `src/commands/registry/` | CLI catalog by family (`R` / `Ra` / `W`) |
| `src/commands/validators.ts` | Shared Zod arg schemas |
| `src/commands/write-policy.ts` | `dangerous` / `secretArgs` / `snapshotRead` / … |
| `src/commands/write-executor.ts` | Confirm → snapshot → execute → commit → audit |
| `src/commands/build.ts` | MCP tool registration |
| `src/commands/read-allowlist.ts` | Registry-derived allowlist for `runCommand()` |
| `src/ssh/driver.ts` | Interactive shell client + host-key verify |

DrayOS SSH does **not** support the exec channel or key auth — password auth
and an interactive shell only.

## Tools

Every registry command becomes an MCP tool:

- **Read tools (108)** — run the CLI and return output (structured when a
  parser exists). Formatters receive validated args (e.g. `ip_ping` target).
- **Write tools (109)** — first call returns a preview + `confirm_token` (or
  `confirmation_id` in human-confirm mode); second call executes.

| Tool | CLI (live-verified, fw 4.4.7_RC2) |
| --- | --- |
| `sys_version` | `sys version` |
| `show_status` | `show status` |
| `wan_status` | `wan status` |
| `show_lan` | `show lan` |
| `ip_route_status` | `ip route status` |
| `ip_arp_status` | `ip arp status` |
| `dhcp_status` | `srv dhcp status` |
| `ip_ping` | `ip ping <ipv4>` (5 packets) |

## Requirements

- Node.js >= 24
- Router SSH enabled (`System Maintenance >> Management`), reachable on the LAN
- Admin password and **SSH host fingerprint** in `.env`

## Setup

```bash
cp .env.example .env
# Set VIGOR_HOST / PORT / USER / PASSWORD
# Pin the host key (required for live routers):
ssh-keyscan -t rsa,ecdsa,ed25519 "$VIGOR_HOST" 2>/dev/null | ssh-keygen -lf - -E sha256
# → put the SHA256:… value in VIGOR_SSH_HOST_FINGERPRINT
# Recommended local surface:
# EXPOSE_TOOLS=readonly
chmod 600 .env
npm install
npm run build
```

## Register in opencode

Add to `opencode.json` (project or global):

```json
{
  "mcp": {
    "vigor3912s": {
      "type": "local",
      "command": ["node", "/abs/path/to/vigor3912s-mcp/dist/index.js"],
      "cwd": "/abs/path/to/vigor3912s-mcp",
      "enabled": true
    }
  }
}
```

Restart opencode, then: `get the WAN status from the router`.

## Logging (SQLite)

Every router request is logged to `data/vigor3912s.db` (or `VIGOR_LOG_DB`, WAL):

- `requests` — tool, CLI, args, outcome, timing, output excerpt
- `write_audit` — preview / executed / failed / expired / mismatch / denied,
  optional before/after snapshots, `commit_status`

Passwords and configured `secretArgs` are redacted to `***`. Logging is
best-effort and never blocks a router command.

```bash
sqlite3 data/vigor3912s.db "SELECT ts, tool_id, command, outcome FROM requests ORDER BY id DESC LIMIT 20;"
sqlite3 data/vigor3912s.db "SELECT ts, tool_id, status, success FROM write_audit ORDER BY id DESC LIMIT 20;"
```

## Development

```bash
npm run lint        # tsc --noEmit
npm test            # unit tests (mocked ssh2; no router)
npm run e2e         # read tools vs real router (needs .env + host pin)
npm run e2e:testing # full tool surface vs simulated DrayOS (CI)
```

## Security

See [SECURITY.md](SECURITY.md) for the threat model, live-router ops
(`HUMAN_CONFIRM` / `readonly`), and accepted risks (`noControl` passwords,
internal `sys commit` after a gated write).

- Never weaken the driver allowlist/blocklist or the confirm gate.
- Do not set `VIGOR_SSH_INSECURE_SKIP_VERIFY=true` against a live router on an
  untrusted LAN.
