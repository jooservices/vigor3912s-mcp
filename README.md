# jooservices/vigor3912s-mcp

[![CI](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/ci.yml)
[![E2E](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/e2e.yml/badge.svg?branch=develop)](https://github.com/jooservices/vigor3912s-mcp/actions/workflows/e2e.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/jooservices/vigor3912s-mcp/badge)](https://securityscorecards.dev/viewer/?uri=github.com/jooservices/vigor3912s-mcp)
[![Node](https://img.shields.io/badge/Node-24.21.0%2B-blue.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)](CHANGELOG.md)

MCP server (Model Context Protocol) for a DrayTek Vigor 3912S router (DrayOS)
over SSH.

Covers the **CLI command set as MCP tools** (666 tools / 43 families), driven by
`@jooservices/vigor3912s-sdk` + `@jooservices/ssh-client`:

- **Read commands (220)** run freely when exposed — curated reads plus
  auto-registered SDK ops with a schema-derived arg surface (`sdk_generated`).
- **Write commands (446)** require a two-step Ed25519 confirm gate (preview →
  signed approval) before execution. Dual-tier writes also need
  `acknowledge: true`.

## Status

`v2.0.1` — local stdio MCP server for trusted LAN use; hosted on
[jooservices/vigor3912s-mcp](https://github.com/jooservices/vigor3912s-mcp).

The registry contains 666 tools across 43 families (220 read / 446 write); 663
use the SDK and three reviewed compatibility tools use the raw command path.
Local deployments expose only read tools by default. Set `EXPOSE_TOOLS=all`
explicitly to expose the full catalog. Write tools are exercised in CI against
a simulated DrayOS server (`npm run e2e:testing`).

**Upgrade from 1.x:** see the [2.0 migration guide](docs/02-guides/upgrade-2.0.md).

## Documentation

- [Overview](docs/01-overview/overview.md) · [Architecture](docs/01-overview/architecture.md)
- [User guide](docs/02-guides/user-guide.md) · [Admin guide](docs/02-guides/admin-guide.md) · [Troubleshooting](docs/02-guides/troubleshooting.md)
- [Upgrade from 1.x to 2.0](docs/02-guides/upgrade-2.0.md)
- [Command registry](docs/03-reference/commands.md) · [Logging schema](docs/03-reference/logging-schema.md) · [Configuration](docs/03-reference/configuration.md) · [MCP integration](docs/03-reference/mcp-integration.md)
- [Development](docs/04-development/development.md) · [Testing](docs/04-development/testing.md) · [SDK integration](docs/04-development/sdk-integration.md)
- [Vigor 3912S reference](docs/05-3912s-reference/README.md) (self-contained, incl. original PDFs)
- [CHANGELOG](CHANGELOG.md) · [SECURITY](SECURITY.md)

## Safety model

- **SSH host-key pin** — set `VIGOR_SSH_HOST_FINGERPRINT` (required). Use
  `VIGOR_SSH_INSECURE_SKIP_VERIFY=true` only for tests / simulated DrayOS.
- **Read tools** — unit tests (mocked transport) and local real-router E2E
  (`npm run e2e` with `EXPOSE_TOOLS=readonly`).
- **Write tools** — unit tests with a mocked client; CI E2E exercises confirmed
  writes only against the simulated DrayOS server (`npm run e2e:testing`).
  A write executes only after Ed25519 signed approval.
- **Confirm gate** — single-use 60s intent bound to the command digest; human
  signs with a private key (`tools/approve.mjs`); MCP verifies `VIGOR_APPROVE_PUBKEY`.
- **Dangerous writes** — additionally require `acknowledge: true` and return a
  lockout warning (policy in `src/commands/tool-policy.ts`).
- **Auto-commit** — after a successful confirmed write, `sys commit` runs
  (`VIGOR_AUTO_COMMIT`; skipped for `skipCommit`). Outcome in
  `write_audit.commit_status`.
- **Command mutex** — commands are serialized on the shared SSH shell; writes
  use an exclusive confirm→execute lock.
- **Hard blocklist** — `sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
  `linux clean *` refused regardless of the registry.
- **Tool filters** — `EXPOSE_TOOLS` / `VIGOR_DISABLED_TOOLS`; read output capped
  via `VIGOR_TOOL_OUTPUT_LIMIT`.
- **Injection guards** — shared Zod validators (`safeText` / `noControl` /
  `ipv4Mask`, …) aligned with SDK command framing.
- Credentials live only in `.env` (chmod 600, gitignored); secret args are
  redacted in SQLite logs and pending confirm files (`0600`).

## Architecture

```
opencode ←stdio→ MCP server (Node 24 + TypeScript)
                        │ @jooservices/vigor3912s-sdk + ssh-client
                        ▼
                DrayOS CLI @ <VIGOR_HOST>  (prompt `DrayTek> `)
```

| Layer | Role |
| --- | --- |
| `src/commands/registry/` | CLI catalog by family (`R` / `Ra` / `W`) + schema-generated SDK tools |
| `src/commands/validators.ts` | Shared Zod arg schemas |
| `src/commands/tool-policy.ts` | Confirm tiers / secret fields / sensitive output / snapshots |
| `src/commands/write-executor.ts` | Sign-gated confirm → snapshot → execute → commit → audit |
| `src/commands/build.ts` | MCP tool registration |
| `src/commands/read-allowlist.ts` | Registry-derived allowlist for `runCommand()` |
| `src/ssh/sdk-vigor-client.ts` | SDK client + `SshClientTransport` |

DrayOS SSH does **not** support the exec channel or key auth — password auth
and an interactive shell only.

## Tools

Every registry command becomes an MCP tool:

- **Read tools (220)** — run the CLI and return output (structured when a
  formatter exists). Formatters receive validated args (e.g. `ip_ping` target).
- **Write tools (446)** — first call returns a redacted preview +
  `confirmation_id` / `sign_payload`; second call requires `signature`
  (and `acknowledge: true` for dual-tier tools).

When a write includes secret fields, its preview uses named markers such as
`<redacted:param>` and returns `redacted_fields`. Approving that intent prompts
for each value with input hidden; the CLI signs only if the re-entered values
rebuild the exact command digest. Secret values are not saved in the pending
intent. It refuses this flow without an interactive TTY. Raw payload signing
is an explicit blind bypass:
`node tools/approve.mjs --payload <file|-> --blind` prints a warning.

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
| `internet_set` | `internet -W <n> -M <mode> [-S ispName]` (write; signed) |

## Requirements

| Component | Requirement |
| --- | --- |
| Node.js | >= 24.21.0 and < 25 (`package.json` `engines` / `.nvmrc`) |
| npm | >= 12.0.2 and < 13 (SDK package engine) |
| `@jooservices/ssh-client` | >= 1.3.0; CI defaults to v1.3.0 |
| `@jooservices/vigor3912s-sdk` | >= 2.0.0; CI defaults to v2.0.0 |
| Install layout | Sibling packages at `../ssh-client` and `../vigor3912s-sdk` for local/CI `file:` dependencies |
| Router | Vigor 3912S with SSH enabled and reachable on the LAN |
| Credentials | Admin password and pinned SSH host fingerprint in `.env` |
| Write approvals | Ed25519 approve public key; not required when `VIGOR_READ_ONLY=true` |

## Setup

```bash
cp .env.example .env
# Set VIGOR_HOST / VIGOR_PORT / VIGOR_USER / VIGOR_PASSWORD
# Pin the host key (required for live routers):
ssh-keyscan -t rsa,ecdsa,ed25519 "$VIGOR_HOST" 2>/dev/null | ssh-keygen -lf - -E sha256
# → put the SHA256:… value in VIGOR_SSH_HOST_FINGERPRINT
# Generate approve keys for writes:
node tools/approve-keygen.mjs
# → set VIGOR_APPROVE_PUBKEY from the printed value / public PEM
# Default exposure is readonly; opt in to all 666 tools with:
# EXPOSE_TOOLS=all
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

Passwords and configured `secretArgs` are redacted to `***` in argument logs;
secret command values use named placeholders in approval previews. Logging is
best-effort and never blocks a router command.

```bash
sqlite3 data/vigor3912s.db "SELECT ts, tool_id, command, outcome FROM requests ORDER BY id DESC LIMIT 20;"
sqlite3 data/vigor3912s.db "SELECT ts, tool_id, status, success FROM write_audit ORDER BY id DESC LIMIT 20;"
```

## Development

```bash
npm run lint        # tsc --noEmit
npm test            # unit tests (mocked transport; no router)
npm run e2e         # tools vs target in .env (use EXPOSE_TOOLS=readonly locally)
npm run e2e:testing # full tool surface + confirmed writes vs simulated DrayOS (CI)
```

## Security

See [SECURITY.md](SECURITY.md) for the threat model, live-router ops
(Ed25519 approve / `readonly`), and accepted risks (`noControl` passwords,
internal `sys commit` after a gated write).

- Never weaken the driver allowlist/blocklist or the confirm gate.
- Do not set `VIGOR_SSH_INSECURE_SKIP_VERIFY=true` against a live router on an
  untrusted LAN.
