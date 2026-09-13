# vigor3912s-mcp

This file adds project-only rules.

# Safety model

This MCP server talks to a live DrayTek Vigor 3912S router (DrayOS).

- **Read commands** run freely (verified view/status/display commands only) and
  are covered by both unit tests and the read-only E2E suite.
- **Write commands** never run automatically: each requires the two-step
  confirm gate (preview -> single-use 60s token bound to the exact command).
  Writes are covered by unit tests with a mocked shell ONLY. The E2E suite
  never calls a write tool and never sends a write command to the router.
- The driver enforces this: `runCommand()` only allows registry read commands;
  `runWriteCommand()` only runs a command explicitly authorized after
  confirmation. No free-form commands reach the router.

Rules:

- Do not add a free-form / generic command execution tool.
- Do not add write commands to the E2E suite (router writes are forbidden in E2E).
- When adding a command to the registry, classify it accurately: `read`
  (view/status/display only) vs `write` (anything that changes state).
- Never weaken the driver gates or the confirm gate.