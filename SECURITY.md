# Security

## Reporting a vulnerability

Do **not** open a public issue. Report to the project maintainer privately
(<jooservices@gmail.com>). Include steps to reproduce and the affected version.

## Threat model

This MCP server holds **admin credentials to a live router** and can change
router configuration. It is designed to run on a trusted local machine on the
same LAN as the router.

## Safety guarantees

- **Read-only by default at the driver**: `runCommand()` only allows registry
  read commands; everything else is refused before reaching the router.
- **Writes require explicit confirmation**: single-use, 60s token bound to the
  exact command; dangerous writes additionally require `acknowledge: true`.
- **Hard blocklist**: `sys cfg default`, `sys halt`, `mngt rmtcfg enable`, and
  `linux clean *` are refused regardless of the registry.
- **Command mutex**: commands are serialized; concurrent calls never interleave.
- **Read-only mode**: `VIGOR_READ_ONLY=true` disables all write tools.
- **Injection guards**: free-form args reject control characters and shell
  metacharacters.
- **No secrets in logs**: passwords and secret args are redacted to `***`;
  credentials live only in `.env` (chmod 600, gitignored).

## Credential handling

- Credentials come only from `.env`. They are never logged, echoed, or exposed
  through tool arguments.
- Restrict `.env` to the owner (`chmod 600`).

## Network exposure

- The server and the router management interface (SSH/WebUI) should stay on a
  trusted LAN. Do not expose the MCP server or router management to the
  Internet.
- Keep the router firmware updated — see
  `docs/05-3912s-reference/security/` for known CVEs affecting Vigor 3912S.

## Dependency audit

`npm audit` reports one **moderate** dev-only advisory (`GHSA-82fw-gwwq-j7x9`
via `@vitest/mocker`). It affects the test runner only, never the router or the
MCP data path. Triage before any public CI hardening.