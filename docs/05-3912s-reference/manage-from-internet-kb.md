# Manage the Router from the Internet

Source: https://www.draytek.com/support/knowledge-base/5352 (DrayTek Knowledge Base, System)

Vigor Router offers remote management access; however, it is **disabled by default** for security. To manage the router from the Internet:

## DrayOS (3912 series)

1. **Connect to the Internet** — WAN interface online with a public IP. Note the WAN IP.
2. **Allow access from the Internet** — `System Maintenance >> Management`, check **Allow management from the Internet**, enable the interfaces you need (SSH for CLI, HTTPS for Web UI). Access via `https://[Router WAN IP]`.
3. **(Recommended) Access List** — restrict remote access to a specific IP. Enable Access List and add the remote host's public IP to the IP List. Disable if the peer has no static public IP.
4. **(Recommended) Change management port** — e.g. access via `https://[WAN IP]:4433`.
5. **(Recommended) Enable Brute Force Protection**.
6. Access via browser `https://[WAN IP]`.

## DrayOS Linux (alternative firmware branch)

- `System Maintenance / Management / Service Control` → select IPv4 WAN Access management options (HTTP/HTTPS).
- `System Maintenance / Account & Permission` → edit the account → enable **Allow login from WAN**.
- Access List: add IP Object (`Configuration / Objects / IP Object`) → IP Group → `Management / Service Control` → WAN Access Control Mode = Allow List → add group.
- Change management port.

**Security note:** Keep management from the Internet DISABLED unless required. Prefer SSH/HTTPS only, restrict by Access List, change ports, enable brute-force protection.
