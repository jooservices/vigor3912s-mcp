# Testing

## Unit tests (required, ≥90% all metrics)

`npm run test:coverage` (also via `npm run ci`):

| Metric | Gate |
| --- | --- |
| statements / lines / functions / branches | ≥90% |

Mocks: `FakeVigorClient` / `FakeSshClient`. Coverage excludes curated
`registry/**`, `config.ts`, `index.ts`, `build.ts`, `confirm-gate.ts` (covered
by dedicated/e2e flows). Human-confirm / token deny matrix is covered in
`write-executor.test.ts`.

## E2E

| Track | Command | Target |
| --- | --- | --- |
| Real router (readonly) | `npm run e2e` with `.env` + `EXPOSE_TOOLS=readonly` | Live 3912S — **manual / later** |
| CI / fake full | `npm run e2e:testing` | `fake-drayos` + all tools |

Never commit real credentials. CI uses the fake server only.
