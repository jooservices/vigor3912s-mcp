# Security

## Reporting a vulnerability

Do **not** open a public issue. Report to the project maintainer privately
(<jooservices@gmail.com>). Include steps to reproduce and the affected version.

## Threat model

This MCP server holds **admin credentials to a live router** and can change
router configuration. It is designed to run on a trusted local machine on the
same LAN as the router.

## Safety guarantees

- **SSH host-key pinning**: `VIGOR_SSH_HOST_FINGERPRINT` is required unless
  `VIGOR_SSH_INSECURE_SKIP_VERIFY=true` is set explicitly (tests / simulated
  DrayOS only). Mismatched keys abort before password auth completes.
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

## Live-router operations

Default `VIGOR_HUMAN_CONFIRM=false` returns a `confirm_token` to the model, so
an agent can approve its own write. That is intentional for local automation on
a trusted machine. For a live router with real impact:

- Prefer `EXPOSE_TOOLS=readonly` unless writes are required, and/or
- Set `VIGOR_HUMAN_CONFIRM=true` with `VIGOR_CONFIRM_PASSPHRASE` so the model
  never sees the token (human approval via `tools/confirm.mjs`).

## Accepted risks

- **`noControl` on password fields** allows shell metacharacters so real admin
  passwords are not rejected; control characters (CR/LF) remain blocked.
  Free-form CLI params still use the stricter `safeText`.
- **`sys commit` after a confirmed write** is authorized internally without a
  second confirm token. It only runs inside this process after a successful
  gated write (or when `skipCommit` is set).

## Dependency audit

Run `npm audit` regularly. Dev-only advisories in the test runner must not be
ignored indefinitely; upgrade when a compatible fixed release is available.