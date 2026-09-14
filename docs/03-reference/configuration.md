# Configuration

All configuration comes from environment variables (loaded from `.env` in the
project directory via `dotenv`).

## Connection

| Variable | Default | Meaning |
| --- | --- | --- |
| `VIGOR_HOST` | `192.168.1.1` | Router address |
| `VIGOR_PORT` | `22` | SSH port |
| `VIGOR_USER` | `admin` | Router admin user |
| `VIGOR_PASSWORD` | — (required) | Router admin password |

> The password is stored plaintext in `.env` (chmod 600). It is never logged or
> echoed. Prefer `VIGOR_READ_ONLY=true` if you only need monitoring.

## Logging

| Variable | Default | Meaning |
| --- | --- | --- |
| `VIGOR_LOG_DB` | `data/vigor3912s.db` | SQLite log database path |

## Safety switches

| Variable | Default | Meaning |
| --- | --- | --- |
| `VIGOR_READ_ONLY` | `false` | `true` = write tools are **not registered** (monitoring only) |
| `VIGOR_AUTO_COMMIT` | `true` | Run `sys commit` after a successful confirmed write (skipped for `skipCommit` commands) |
| `VIGOR_HUMAN_CONFIRM` | `false` | `true` = every write requires a human: the confirm token is hidden and the human must provide the confirmation code |
| `VIGOR_CONFIRM_PASSPHRASE` | *(unset)* | The confirmation code the human types to approve a write (required when `VIGOR_HUMAN_CONFIRM=true`, min 8 chars) |

## Tool exposure (`EXPOSE_TOOLS`)

| Variable | Default | Meaning |
| --- | --- | --- |
| `EXPOSE_TOOLS` | *(empty = all)* | Whitelist of tool ids exposed to the AI |

Special values:

- `EXPOSE_TOOLS=readonly` → only read tools are registered (write tools do not
  exist in the tool list).
- `EXPOSE_TOOLS=all` (or unset) → every tool is registered.
- Otherwise a comma-separated list of tool ids, e.g.
  `EXPOSE_TOOLS=wan_status,show_status,show_lan`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VIGOR_DISABLED_TOOLS` | *(empty)* | Comma-separated tool ids that are never registered (applied on top of `EXPOSE_TOOLS`) |

For a local deployment against the real router, use `EXPOSE_TOOLS=readonly` so
the AI surface is monitoring-only. GitHub Actions uses `EXPOSE_TOOLS=all`
against the simulated DrayOS server.

## Output

| Variable | Default | Meaning |
| --- | --- | --- |
| `VIGOR_TOOL_OUTPUT_LIMIT` | `16000` | Max characters a read tool returns before truncation (`0` = unlimited) |

## Full example `.env`

```bash
VIGOR_HOST=192.168.1.1
VIGOR_PORT=22
VIGOR_USER=admin
VIGOR_PASSWORD=your-password
VIGOR_LOG_DB=data/vigor3912s.db
# Expose only read tools to the AI (recommended for local / real router):
EXPOSE_TOOLS=readonly
# VIGOR_READ_ONLY=true
# VIGOR_AUTO_COMMIT=true
# VIGOR_HUMAN_CONFIRM=false
# VIGOR_CONFIRM_PASSPHRASE=change-me-strong-code
# VIGOR_DISABLED_TOOLS=sys_reboot,testmail_send
# VIGOR_TOOL_OUTPUT_LIMIT=16000
```