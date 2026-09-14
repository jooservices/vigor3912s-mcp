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
  `sys_passwd`, `ip_route_add`).
- Read tools take an empty schema (except `ip_ping` / `ip_tracert` /
  `ip6_ping` / `ip6_tracert`, which take `{ host }`).
- Write tools accept their command args plus:
  - `confirm_token` (string, optional) — required on the confirm call.
  - `acknowledge` (boolean, optional) — required for **dangerous** writes.

## Write confirmation over MCP

Two calls, same tool:

1. **Preview** — call without a confirmation. Returns a preview + a `message`
   to present to the human, plus either:
   - `confirm_token` (default), or
   - `confirmation_id` when `VIGOR_HUMAN_CONFIRM=true` (token hidden).
2. **Confirm** — call again with the same args and:
   - `confirm_token` (default), **or**
   - `confirmation_id` + `user_code` (human-confirm mode; `user_code` must
     equal `VIGOR_CONFIRM_PASSPHRASE`).

Tokens are single-use and expire after 60s. In human-confirm mode the model
cannot complete a write on its own — the human must provide the confirmation
code. Dangerous writes additionally require `acknowledge: true`.

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