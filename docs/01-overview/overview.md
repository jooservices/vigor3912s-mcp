# Vigor 3912S MCP — Overview

An MCP (Model Context Protocol) server that lets AI assistants operate a
**DrayTek Vigor 3912S** router (DrayOS) over SSH — safely.

## What it does

- Exposes the router's **CLI command set** (302 tools / 43 families) as MCP
  tools: curated registry families plus auto-registered zero-arg SDK ops
  (`sdk_void`).
- **150 read tools** — status / diagnostics / views, run freely when exposed.
- **152 write tools** — configuration changes, guarded by Ed25519 signed
  approval (preview → signature → execute).
- Executes via **`@jooservices/vigor3912s-sdk`** over **`@jooservices/ssh-client`**.
- Logs **every request** to a local SQLite database with timing, outcomes, and
  write before/after snapshots.

## Key facts

| | |
| --- | --- |
| Protocol | MCP (stdio transport) |
| Runtime | Node.js >= 24.21 \< 25, TypeScript |
| Router access | SSH interactive shell (DrayOS has no exec channel) |
| Deployment | Local stdio MCP; works with opencode, ChatGPT, Claude Code, etc. |
| Version | 1.0.0 |

## Safety model (summary)

- **SSH host-key pin** (`VIGOR_SSH_HOST_FINGERPRINT`) fails closed by default.
- Read tools only send **verified read-only** commands (allowlist).
- Write tools require a **single-use Ed25519 signature** bound to the command
  digest (60s TTL).
- **Dual-tier writes** additionally require `acknowledge: true`.
- **Command mutex** serializes all commands (no interleaving).
- **Hard blocklist** (`sys cfg default`, `sys halt`, `mngt rmtcfg enable`,
  `linux clean *`) is refused at the client.
- Optional **read-only / `EXPOSE_TOOLS=readonly`** limits the AI surface.
- Secrets and passwords are **redacted** in logs.
- CI E2E never touches a real router for writes.

See [`architecture.md`](./architecture.md) and the project `README.md` for
details.

## Quick start

```bash
cp .env.example .env     # set VIGOR_HOST / USER / PASSWORD / SSH fingerprint
node tools/approve-keygen.mjs   # if you need writes
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
