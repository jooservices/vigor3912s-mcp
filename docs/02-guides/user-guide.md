# User guide

This guide is for anyone running the MCP server and using an AI assistant to
operate the Vigor 3912S router.

## 1. Requirements

- Node.js >= 24.21 \< 25 (see `package.json` `engines` / `.nvmrc`)
- Sibling packages for local install: `../ssh-client`, `../vigor3912s-sdk`
- Router with SSH enabled (`System Maintenance >> Management` → SSH), reachable
  on the LAN
- Admin password and **SSH host fingerprint** in `.env`
- Ed25519 approve keypair if you need writes (`node tools/approve-keygen.mjs`)

## 2. Setup

```bash
cp .env.example .env
chmod 600 .env
# edit .env: VIGOR_HOST, VIGOR_USER, VIGOR_PASSWORD, VIGOR_SSH_HOST_FINGERPRINT
# EXPOSE_TOOLS=readonly recommended locally
# For writes: node tools/approve-keygen.mjs → set VIGOR_APPROVE_PUBKEY
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

Read tools (150) run freely when exposed and need no confirmation:

> *get the WAN status from the router*
> *show the DHCP leases*
> *show the routing table*

Each returns structured data (where a parser exists) plus the raw CLI output.

## 5. Making a change (write flow)

Write tools (152) never run automatically. The flow is always:

**Step 1 — request the change.** The tool returns a **preview** with the exact
CLI command and signing fields:

```json
{
  "status": "needs_confirmation",
  "preview": "internet -W 7 -M 1 -S new-isp-name",
  "confirmation_id": "…",
  "nonce": "…",
  "command_digest": "…",
  "expires_at": 0,
  "sign_payload": "…",
  "affects_network": true,
  "confirm_tier": "dual",
  "dangerous": true,
  "message": "🛑 Router write — cryptographic approval required …",
  "note": "Sign sign_payload with your approve key (tools/approve.mjs), then call again with confirmation_id + signature."
}
```

**Step 2 — approve.** Sign the pending write outside the model:

```bash
node tools/approve.mjs <confirmation_id>
```

Paste the printed `signature` into the next tool call (same args +
`confirmation_id` + `signature`). Dual-tier writes also need
`"acknowledge": true`.

The model cannot forge a valid signature without your private key.
The result reports the change, a **before/after snapshot** (when a snapshot
read is defined), and the `sys commit` outcome.

## 6. Examples

| Goal | Tool (id) | Notes |
| --- | --- | --- |
| WAN status | `wan_status` | read |
| DHCP leases | `dhcp_status` | read |
| Ping a host | `ip_ping` | `{ host: "8.8.8.8" }` |
| Rename WAN ISP label | `internet_set` | `{ wan, mode, ispName }` — write; signed |
| Enable WAN 2 | `wan_enable` | write; confirm + acknowledge (dual) |
| Set DHCP gateway | `dhcp_gateway` | write; confirm |
| Add static route | `ip_route_add` | write; confirm + acknowledge |

## 7. Safety expectations

- Read tools can't change anything.
- A write is only sent after a valid Ed25519 signature for the exact preview.
- Dual / dangerous writes (reboot, ports, WAN/DHCP/firewall, password) require
  an explicit `acknowledge: true`.
- `sys commit` runs automatically after a successful write (unless the command
  is `skipCommit`, e.g. reboot).
- Every request is logged locally; secrets are redacted.

## 8. Read-only mode

Set `VIGOR_READ_ONLY=true` or `EXPOSE_TOOLS=readonly` for monitoring-only
(local recommendation against a live router).
