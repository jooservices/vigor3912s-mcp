# Upgrade from 1.x to 2.0

Version 2.0 changes the default tool surface and the approval flow. Review the
items below before starting the server.

## Requirements

| Component | Required version |
| --- | --- |
| Node.js | >= 24.21.0 and < 25 |
| npm | >= 12.0.2 and < 13 |
| `@jooservices/ssh-client` | >= 1.2.0 |
| `@jooservices/vigor3912s-sdk` | >= 2.0.0 |

For a local checkout, the sibling packages must be present at
`../ssh-client` and `../vigor3912s-sdk`; build their release tags before
installing MCP dependencies.

## Migration steps

1. Update to the 2.0.0 release and rebuild the compatible sibling packages.
2. Choose the exposed tool set. If your 1.x setup relied on the implicit full
   catalog, set `EXPOSE_TOOLS=all` in `.env`. In 2.0, an unset or empty value
   exposes only the 220 read tools; the full catalog contains 666 tools.
3. Refresh any client-side tool definitions. Tool arguments now follow typed
   SDK schemas, and the generated family is named `sdk_generated` instead of
   `sdk_void`.
4. Check that `VIGOR_APPROVE_PUBKEY` is a valid Ed25519 public key. For
   previews containing `<redacted:FIELD>`, run `node tools/approve.mjs <id>` in
   an interactive terminal and re-enter each secret when prompted. The signer
   prints a signature only when the reconstructed command matches the
   requested digest.
5. If you use raw payload signing, pass both `--payload` and `--blind`. This
   bypasses command re-entry verification and prints a warning.
6. Review storage paths. Relative `.env`, database and pending-intent paths
   resolve from the package root. Set `VIGOR_PENDING_FILE` to choose a custom
   intent file; `VIGOR_LOG_DB=:memory:` disables pending-intent persistence.

## Verify the upgrade

```bash
npm ci
npm run ci
npm audit --omit=dev
npm run e2e:testing
```

`npm run e2e:testing` uses the simulated DrayOS server. A real-router run is
read-only by default and requires a configured `.env` and pinned SSH host key.
For a local real-router connection, leave `EXPOSE_TOOLS` unset or set it to
`readonly` unless you intentionally need write tools.
