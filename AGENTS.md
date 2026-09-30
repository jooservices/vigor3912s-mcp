# vigor3912s-mcp

This file adds project-only rules.

# Safety model

This MCP server talks to a live DrayTek Vigor 3912S router (DrayOS).

- **Read commands** run freely (verified view/status/display commands only) and
  are covered by unit tests and the local read-only E2E suite.
- **Write commands** never run automatically: each requires the two-step
  confirm gate (preview -> single-use 60s token bound to the exact command).
  Writes are covered by unit tests with a mocked shell and by the CI E2E suite
  only against the simulated DrayOS server. The local E2E path targeting a
  real router remains read-only.
- The driver enforces this: `runCommand()` only allows registry read commands;
  `runWriteCommand()` and `runWriteOperation()` only run explicitly authorized
  commands/typed frames after confirmation. No free-form commands reach the
  router.

Rules:

- Do not add a free-form / generic command execution tool.
- Do not add write commands to the local/real-router E2E path. CI may exercise
  confirmed writes only against `tools/fake-drayos.mjs`.
- When adding a command to the registry, classify it accurately: `read`
  (view/status/display only) vs `write` (anything that changes state).
- Never weaken the driver gates or the confirm gate.
