# Workflows

Repository-owned GitHub Actions workflows. All jobs run on GitHub-hosted
`ubuntu-latest`.

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | PR to `master`/`develop` | Node 24: `npm ci` + `npm run ci` (lint, unit tests ≥90% coverage, build) + gitleaks secret scan |
| `e2e.yml` | PR to `master`/`develop`, `workflow_dispatch`, nightly | `npm run e2e:testing` — simulated DrayOS server, all tools exposed (reads + write confirm/execute) |
| `commitlint.yml` | PR opened/edited | Validates commit messages against Conventional Commits (`.github/commitlint.config.mjs`) |
| `semantic-pr.yml` | PR opened/edited | Validates the PR title against Conventional Commits |
| `scorecard.yml` | push to `develop`, weekly, dispatch | OpenSSF Scorecard analysis, publishes results + SARIF |

## E2E safety

- `e2e.yml` runs against the **simulated DrayOS SSH server**
  (`tools/fake-drayos.mjs`) via `npm run e2e:testing` (`.env.testing`,
  `EXPOSE_TOOLS=all`). It never connects to a real router.
- The unified E2E (`tools/e2e.mjs`) only tests the tools the server exposes
  (`EXPOSE_TOOLS`). Local deployments default to `EXPOSE_TOOLS=readonly`.
- Write tools are executed only when curated argument values exist; they are
  exercised in CI against the simulated server, never against a real router.

## Required checks

`ci` (Node CI + Secrets) and `e2e` must be fully green before merge. Branch
protection requires these on `master` and `develop`.