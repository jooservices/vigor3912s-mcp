# Testing

## Unit tests (mocked shell)

`npm test` — unit tests across:

- `src/tools/parsers.test.ts` — output parsers against real captured fixtures.
- `src/ssh/driver.test.ts` — allowlist, blocklist, host-key pin, write gate,
  timeout, stream close, reconnect, **mutex serialization**, pager.
- `src/ssh/host-key.test.ts` — fingerprint formatting / matching.
- `src/tools/confirm-gate.test.ts` — token lifecycle, passphrase rate limit.
- `src/db/log.test.ts` — SQLite logging, redaction, SELECT-only `query`.
- `src/commands/validators.test.ts` / `write-policy.test.ts` /
  `read-allowlist.test.ts` — shared schemas, policy merge, allowlist.
- `src/commands/build.test.ts` — registry→MCP flow via in-memory transport:
  registration, read/write confirm, dangerous acknowledge, auto-commit,
  filters, output cap, injection rejection.

The mocked router (`src/test/fake-ssh2.ts`) script-cans responses per command
and can simulate a router that never answers or drops the session.

## E2E (single script, local + CI)

One script — `tools/e2e.mjs` — runs against whatever target the environment
points at (`VIGOR_*`), and can only test the tools that the server exposes
(`EXPOSE_TOOLS`).

| Scenario | Command | What it tests |
| --- | --- | --- |
| Local, real router | `EXPOSE_TOOLS=readonly npm run e2e` | read tools only (writes are not exposed → not tested, never executed) |
| GHA, simulated DrayOS server | `npm run e2e:testing` | every tool: reads + write preview/confirm/execute, dangerous acknowledge, auto-commit |

Safety:

- `EXPOSE_TOOLS=readonly` is the default recommendation for local use — the AI
  surface (and therefore the E2E) contains **no write tools** against the real
  router.
- Write tools are executed when exposed and curated argument values exist.
  GitHub Actions runs `npm run e2e:testing`, which brings up the simulated
  DrayOS server with `.env.testing` (`EXPOSE_TOOLS=all`).
- Already-verified read tools are skipped via
  `recon-output/e2e-passed.json` (incremental local runs).

The simulated server (`tools/fake-drayos.mjs`, ssh2 `Server`) emulates the
DrayOS interactive shell: password auth, `DrayTek> ` prompt, canned responses
generated from the registry, and a log of every received command. It is started
by `npm run e2e:testing` and targeted via `.env.testing`.

Real-device verification (all 108 read tools on fw 4.4.7_RC2) remains an
ad-hoc release gate (`EXPOSE_TOOLS=readonly npm run e2e`).

## Test data policy

- Parser fixtures are real outputs captured from the device (read-only recon),
  not invented data.
- Fakes use generated/representative data — no production credentials or
  secrets.