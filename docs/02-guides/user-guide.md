# User guide

This guide is for anyone running the MCP server and using an AI assistant to
operate the Vigor 3912S router.

## 1. Requirements

- Node.js >= 24
- Router with SSH enabled (`System Maintenance >> Management` → SSH), reachable
  on the LAN
- Admin password for the router

## 2. Setup

```bash
cp .env.example .env
chmod 600 .env
# edit .env: set VIGOR_HOST, VIGOR_USER, VIGOR_PASSWORD (VIGOR_* optional)
npm install
npm run build
```

## 3. Register in your MCP client

**opencode** — add to `opencode.json`:

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

Restart opencode. The tools are prefixed `vigor3912s_` (e.g.
`vigor3912s_wan_status`).

**ChatGPT / Claude / others** — use the same command as a "local / stdio" MCP
server. Reference the tool ids from
[`commands.md`](../03-reference/commands.md).

## 4. Reading the router

Read tools run freely and need no confirmation:

> *get the WAN status from the router*
> *show the DHCP leases*
> *show the routing table*

Each returns structured data (where a parser exists) plus the raw CLI output.

## 5. Making a change (write flow)

Write tools never run automatically. The flow is always:

**Step 1 — request the change.** The tool returns a **preview** of the exact
CLI command plus a `confirm_token`:

```json
{
  "status": "needs_confirmation",
  "preview": "wan disable WAN3",
  "affects_network": true,
  "dangerous": false,
  "confirm_token": "<token-from-preview>"
}
```

**Step 2 — confirm.** Call the same tool again with the same arguments and the
`confirm_token`. Only then is the command sent to the router.

```json
{ "wan": 3, "confirm_token": "<token-from-preview>" }
```

If the write is flagged **dangerous**, the confirm call must also include
`"acknowledge": true`.

The result reports the change, a **before/after snapshot** (when a snapshot
read is defined), and the `sys commit` outcome.

## 6. Examples

| Goal | Tool (id) | Notes |
| --- | --- | --- |
| WAN status | `wan_status` | read |
| DHCP leases | `dhcp_status` | read |
| Ping a host | `ip_ping` | `{ host: "8.8.8.8" }` |
| Enable WAN 2 | `wan_enable` | write; confirm + acknowledge (dangerous) |
| Set DHCP gateway | `dhcp_gateway` | write; confirm |
| Add static route | `ip_route_add` | write; confirm + acknowledge |

## 7. Safety expectations

- Read tools can't change anything.
- A write is only sent after you confirm the exact preview.
- Dangerous writes (reboot, ports, WAN/DHCP/firewall, password) require an
  explicit acknowledge.
- `sys commit` runs automatically after a successful write (unless the command
  is `skipCommit`, e.g. reboot).
- Every request is logged locally; secrets are redacted.

## 8. Read-only mode

Set `VIGOR_READ_ONLY=true` to run monitoring-only: no write tools are
registered at all.