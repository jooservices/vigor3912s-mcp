# MCP integration

The server speaks MCP over **stdio** (`@modelcontextprotocol/sdk`). Start it
with `node dist/index.js` from the project directory; the `.env` file is loaded
from the working directory, so clients must set the working directory to the
project.

## Registering

### opencode

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

Restart opencode. Tool names are prefixed with the server name:
`vigor3912s_<tool_id>` (e.g. `vigor3912s_wan_status`).

### ChatGPT / Claude Desktop / other stdio clients

Point the client at the same command (`node <abs path>/dist/index.js`) with
working directory = project dir. Tool ids match `docs/03-reference/commands.md`.

## Tool naming & types

- Tool ids are the registry ids (e.g. `wan_status`, `dhcp_status`,
  `sys_passwd`, `ip_route_add`, `internet_set`).
- Read tools use their registry Zod schemas (many are empty; diagnostics like
  `ip_ping` take `{ host }`; curated families may take typed fields).
- Write tools accept their command args plus:
  - `confirmation_id` (string, optional) — from the preview response.
  - `signature` (string, optional) — Ed25519 signature over `sign_payload`.
  - `acknowledge` (boolean, optional) — required for **dual** / dangerous writes.

## Write confirmation over MCP

Two calls, same tool:

1. **Preview** — call without approval fields. Returns a redacted preview,
   `confirmation_id`, `nonce`, `command_digest`, `expires_at`, and
   `sign_payload`.
2. **Confirm** — sign `sign_payload` with your approve private key
   (`node tools/approve.mjs …`), then call again with the same args plus
   `confirmation_id` + `signature`. Dual-tier writes also need
   `acknowledge: true`.

Signatures are single-use and bound to the command digest (60s TTL). The model
cannot complete a write without a human-produced signature.
## Read-only / exposure control

The AI surface is controlled by **`EXPOSE_TOOLS`**:

- `EXPOSE_TOOLS=readonly` → only read tools are registered (recommended for a
  local deployment against the real router).
- `EXPOSE_TOOLS=all` (or unset) → all tools are registered.
- A comma-separated list → only those tool ids.

`VIGOR_READ_ONLY=true` additionally refuses any write at the driver, even if a
write tool is exposed.

## Limitations

- The DrayOS SSH server does **not** support the exec channel or key auth, so
  the server must drive an interactive shell. This is transparent to MCP
  clients.
- Config backup/restore is WebUI-only and is not exposed via MCP.