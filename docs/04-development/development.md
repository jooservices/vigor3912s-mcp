# Development

## Layout

```
src/
  index.ts            MCP server entry (buildServer + stdio)
  config.ts           env loading/validation
  commands/
    registry/         curated MCP tool catalog + auto sdk_void coverage
    build.ts          catalog → MCP tool registration
    write-executor.ts confirm tier → execute → commit → audit
    write-policy.ts   Layer 2 confirm tiers (auto/confirm/dual)
  db/log.ts           SQLite logging (node:sqlite)
  ssh/
    client.ts         VigorClient policy façade contract
    sdk-vigor-client.ts  MCP policy + SDK invoke/execute
    ssh-client-transport.ts  SDK Transport → ssh-client
  sdk/
    void-operation-index.ts  zero-arg CLI → SDK typed op
  tools/
    confirm-gate.ts   two-step write confirmation
  test/
    fake-ssh-client.ts / fake-vigor-client.ts
tools/
  e2e.mjs / e2e:testing   E2E (fake DrayOS or real target)
  approve-keygen.mjs / approve.mjs   Ed25519 write approval helpers
  e2e_wan7_ispname_*.mjs  live safe ISP Name rename/revert (LAN)
  gen-commands.mjs        regenerates docs/03-reference/commands.md
```

## Wire path

```text
MCP tools / confirm tiers / audit
  → SdkVigorClient (allowlist, blocklist, authorize)
      → vigor3912s-sdk (invoke for zero-arg mapped ops, else execute)
          → SshClientTransport → ssh-client → router
```

## Commands

```bash
npm run build     # tsc → dist/
npm run lint      # tsc --noEmit
npm test          # vitest (no real router)
npm run e2e       # unified E2E (uses .env target + EXPOSE_TOOLS)
npm run e2e:testing  # CI E2E: simulated DrayOS server, all tools
```

## Adding or changing a command

Edit the matching family file under `src/commands/registry/families/` and
`write-policy.ts` when confirm tier / secrets / snapshots change.

Regenerate reference docs with `node tools/gen-commands.mjs` when the catalog
changes.
