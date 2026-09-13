# Testing

## Unit tests (mocked shell)

`npm test` — 50 tests across:

- `src/tools/parsers.test.ts` — output parsers against real captured fixtures.
- `src/ssh/driver.test.ts` — allowlist, blocklist, write gate, timeout, stream
  close, reconnect, **mutex serialization**, read-only mode, pager.
- `src/tools/confirm-gate.test.ts` — token lifecycle (single-use, expiry,
  mismatch, intent cap, prune).
- `src/db/log.test.ts` — SQLite logging + redaction.
- `src/commands/build.test.ts` — registry→MCP flow via in-memory transport:
  registration completeness, read calls, write preview/confirm, dangerous
  acknowledge, auto-commit, tool filters, output cap, injection rejection.

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

The fake server (`tools/fake-drayos.mjs`, ssh2 `Server`) emulates the DrayOS
interactive shell: password auth, `DrayTek> ` prompt, canned responses generated
from the registry, and a log of every received command. In GHA it is started by
the workflow job and targeted via `VIGOR_HOST=127.0.0.1 VIGOR_PORT=<port>`.

Real-device verification (all 108 read tools on fw 4.4.7_RC2) remains an
ad-hoc release gate (`EXPOSE_TOOLS=readonly npm run e2e`).

## Test data policy

- Parser fixtures are real outputs captured from the device (read-only recon),
  not invented data.
- Fakes use generated/representative data — no production credentials or
  secrets.