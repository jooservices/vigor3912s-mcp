# Contributing

Thanks for helping improve `vigor3912s-mcp`.

## Scope

This project controls a **live network router**. Safety is the top priority:

- **Read tools** only run verified read commands.
- **Write tools** are two-step (confirm gate) and **never** executed in the E2E
  suite against a real router — writes are covered by unit tests (mocked shell)
  and the fake-DrayOS E2E.

## Development flow

1. Branch from `develop` (see the workspace branch model).
2. Implement with tests. Run the local gate before opening a PR:
   ```bash
   npm run ci      # lint + unit tests + build
   ```
3. For registry changes, regenerate the command table:
   ```bash
   node tools/gen-commands.mjs
   ```
4. For read-tool changes, verify against the real router when possible:
   ```bash
   npm run e2e     # runs not-yet-verified read tools one-by-one
   ```

## Adding a command

Edit the matching file under `src/commands/registry/families/`:

- Classify `read` vs `write` accurately.
- Validate args with zod; use `noControl()` / `safeText()` for free-form text.
- Set write flags: `dangerous`, `affectsNetwork`, `secretArgs`, `snapshotRead`,
  `skipCommit`.

## Rules

- No free-form / generic command execution tool.
- Never weaken the driver gates, the blocklist, or the confirm gate.
- Write commands must never appear in the real-router E2E.
- Follow workspace conventions: Conventional Commits (English), identity, PR
  into `develop`.

## Tests

See `docs/04-development/testing.md`.