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
- **Writes require signed approval**: preview returns `confirmation_id` +
  `sign_payload`; execute requires an Ed25519 `signature` verified against
  `VIGOR_APPROVE_PUBKEY`. Dual-tier writes also need `acknowledge: true`.
- **Hard blocklist**: `sys cfg default`, `sys halt`, `mngt rmtcfg enable`, and
  `linux clean *` are refused regardless of the registry.
- **Command mutex**: commands are serialized; concurrent writes use an exclusive
  confirm→execute lock.
- **Read-only mode**: `VIGOR_READ_ONLY=true` disables all write tools.
- **Injection guards**: free-form args reject control characters and framing
  metacharacters (aligned with the SDK `frameSingleCommand` rules).
- **No secrets in logs**: passwords and secret args are redacted to `***`;
  pending confirm files store digests + redacted previews only (`0600`);
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

Writes cannot be self-approved by the model. Generate a keypair
(`node tools/approve-keygen.mjs`), set `VIGOR_APPROVE_PUBKEY` on the MCP host,
and sign each pending write with `node tools/approve.mjs <id>` (private key
stays offline). Prefer `EXPOSE_TOOLS=readonly` unless writes are required.

## Accepted risks

- **`noControl` on password fields** rejects framing-unsafe metacharacters
  (`;|&\`$` / `$(`) so MCP validation matches the SDK; control characters
  (CR/LF) remain blocked. Free-form CLI params still use the stricter
  `safeText`.
- **`sys commit` after a confirmed write** is authorized internally without a
  second approval signature. It only runs inside this process after a
  successful gated write when auto-commit is enabled and `skipCommit` is not
  true.

## Dependency audit

Run `npm audit` regularly. Dev-only advisories in the test runner must not be
ignored indefinitely; upgrade when a compatible fixed release is available.