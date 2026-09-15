# Troubleshooting

## Connection failures

**"SSH connection error" / can't connect**
- SSH server enabled on the router (`System Maintenance >> Management` → SSH)?
- Host/port/user/password correct in `.env`?
- Router reachable? `nc -z -G 3 <host> 22`
- **Brute-force protection** may have temporarily blocked your IP after rapid
  connections. Wait a few minutes, or check `mngt bfp` on the router.
- Concurrent admin sessions limit — close other SSH sessions.

**"no prompt after login"**
- Password may have changed. Automation stops working until `.env` is updated.
- The router may be mid-reboot. Retry.

**Legacy cipher errors**
- Modern firmware (4.4.7_RC2) negotiates modern algorithms; older firmware may
  need `-c 3des-cbc` / legacy kex. See `docs/05-3912s-reference/drayos-cli.md`.

## Write / confirm issues

**"confirmation … not found / used / expired" / invalid signature**
- Approvals are single-use and expire after 60s. Request a new preview, sign
  promptly with `node tools/approve.mjs <confirmation_id>`, and re-call with
  the same args + `confirmation_id` + `signature`.

**"dual-confirm write requires acknowledge: true"**
- The command is dual-tier / dangerous. Re-call with `"acknowledge": true`.
  The pending intent is preserved (not consumed) by this rejection.

**"write command was not confirmed and was refused"**
- The write was not authorized (signature path failed). Get a fresh preview
  and a new signature.

**Missing `VIGOR_APPROVE_PUBKEY`**
- Required unless `VIGOR_READ_ONLY=true`. Run `node tools/approve-keygen.mjs`
  and set the printed public key in `.env`.

**"read-only mode is enabled; write commands are refused"**
- `VIGOR_READ_ONLY=true` is set (or writes are filtered out of
  `EXPOSE_TOOLS`). Adjust env to enable writes.

## Runtime

**Concurrent tool calls interleave / wrong output**
- Should not happen (command mutex). If it does, check for multiple MCP server
  processes sharing one session.

**Output truncated**
- Read tool output is capped (`VIGOR_TOOL_OUTPUT_LIMIT`, default 16000 chars);
  the result carries `"truncated": true`. Raise the limit if needed.

**Logging is empty**
- Check `data/vigor3912s.db` exists and `VIGOR_LOG_DB` isn't pointing elsewhere.
  Log failures never block commands; if SQLite failed, a warning was printed to
  stderr at startup.

## Firmware differences

- Command output/syntax can change between firmware versions. This project was
  verified on **4.4.7_RC2**. If your router is on a different version, verify
  with `?`, `<family> ?`, `<cmd> ?`, and re-run the read-only E2E
  (`npm run e2e`).

## Known limits

- Config **backup/restore is WebUI-only** (no CLI command). The MCP server does
  not automate config backup.
- Write-command argument syntax for some commands is best-effort (from recon +
  docs). The preview always shows the exact CLI before you confirm.
- The E2E suite runs read tools against the real router only; write behavior is
  covered by unit tests and the fake-DrayOS E2E.