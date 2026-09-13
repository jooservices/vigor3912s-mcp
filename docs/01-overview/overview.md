# Vigor 3912S MCP — Overview

An MCP (Model Context Protocol) server that lets AI assistants operate a
**DrayTek Vigor 3912S** router (DrayOS) over SSH — safely.

## What it does

- Exposes the router's **full CLI command set** (217 commands / 42 families) as
  MCP tools, generated from a single command registry.
- **108 read tools** — status / diagnostics / views, run freely.
- **109 write tools** — configuration changes, guarded by a two-step confirm
  gate (preview → token → execute).
- Logs **every request** to a local SQLite database with timing, outcomes, and
  write before/after snapshots.

## Key facts

| | |
| --- | --- |
| Protocol | MCP (stdio transport) |
| Runtime | Node.js >= 24, TypeScript |
| Router access | SSH interactive shell (DrayOS has no exec channel) |
| Deployment | Local macOS (stdio); works with opencode, ChatGPT, Claude Code, etc. |
| Version | 1.0.0 |

## Safety model (summary)

- Read tools only send **verified read-only** commands (allowlist).
- Write tools require a **single-use, 60s token** bound to the exact command.
- **Dangerous writes** additionally require `acknowledge: true`.
- **Command mutex** serializes all commands (no interleaving).
- **Hard blocklist** (`sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
  `linux clean *`) is refused at the driver.
- Optional **read-only mode** (`VIGOR_READ_ONLY=true`) disables all writes.
- Secrets and passwords are **redacted** in logs.
- The E2E suite never touches a real router for writes.

See [`architecture.md`](./architecture.md) and the project `README.md` for
details.

## Quick start

```bash
cp .env.example .env     # set VIGOR_HOST / VIGOR_USER / VIGOR_PASSWORD
chmod 600 .env
npm install
npm run build
```

Register in opencode (`opencode.json`) and restart:

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

Then ask your assistant: **"get the WAN status from the router"**.