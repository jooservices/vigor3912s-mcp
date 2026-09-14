# Development

## Layout

```
src/
  index.ts            MCP server entry (buildServer + stdio)
  config.ts           env loading/validation
  commands/
    registry/         single source of truth: 217 commands / 42 families
    build.ts          registry → MCP tool registration
    write-executor.ts write confirm → execute → commit → audit
  db/log.ts           SQLite logging (node:sqlite)
  ssh/
    client.ts         VigorClient interface (SDK-ready contract)
    driver.ts         SshVigorClient (ssh2 shell implementation)
  tools/
    parsers.ts        output parsers (best-effort; raw always included)
    confirm-gate.ts   two-step write confirmation
  test/fake-ssh2.ts   shared fake router shell for unit tests
tools/
  e2e_readonly.mjs    E2E read tools one-by-one against the real router
  e2e_one.mjs         E2E for a single read tool
  gen-commands.mjs    regenerates docs/03-reference/commands.md
```

## Commands

```bash
npm run build     # tsc → dist/
npm run lint      # tsc --noEmit
npm test          # vitest (mocked ssh2, no router needed)
npm run e2e       # unified E2E (uses .env target + EXPOSE_TOOLS)
npm run e2e:testing  # CI E2E: simulated DrayOS server, all tools
```

## Adding or changing a command

Edit the matching family file under `src/commands/registry/families/` only:

1. Classify correctly: `read` = view/status/display only; `write` = changes
   state.
2. Give args a zod schema. Free-form strings must use `noControl()` or
   `safeText()` (blocks CLI injection).
3. For writes set flags: `dangerous` (requires acknowledge), `affectsNetwork`,
   `secretArgs` (redacted in logs), `snapshotRead` (before/after audit),
   `skipCommit` (no auto `sys commit`).
4. Regenerate the docs table: `node tools/gen-commands.mjs`.

## Verification loop

- Unit tests with the mocked shell (`src/test/fake-ssh2.ts`) cover logic without
  a router.
- The unified E2E (`tools/e2e.mjs`) tests the tools exposed by `EXPOSE_TOOLS`:
  local uses `EXPOSE_TOOLS=readonly` (real router, read-only); CI uses
  `npm run e2e:testing` which brings up the simulated DrayOS server with
  `.env.testing` (`EXPOSE_TOOLS=all`, full coverage including writes).
- Write tools are executed only against the simulated server; they never run
  against the real router in CI.

## Runtime Truth

- The command map is firmware-specific. This project was verified on
  **4.4.7_RC2**. Re-verify after any firmware change (`?`, `<cmd> ?`, E2E).
- Never send a command you have not verified — the registry is the only command
  source, and the driver only allows registry read commands + confirmed writes.