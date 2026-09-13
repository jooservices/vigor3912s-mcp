# Logging schema (SQLite)

The server writes to a local SQLite database (`data/vigor3912s.db`, WAL mode,
configurable via `VIGOR_LOG_DB`). Built with `node:sqlite` (no native
dependency).

## Tables

### `requests` — every request sent to the router

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | INTEGER PK | autoincrement |
| `ts` | TEXT | ISO8601 UTC (completion time) |
| `tool_id` | TEXT | registry tool id (e.g. `wan_status`) |
| `kind` | TEXT | `read` \| `write` |
| `command` | TEXT | exact CLI sent (redacted) |
| `args_json` | TEXT | validated args (redacted) |
| `outcome` | TEXT | `ok` \| `error` \| `needs_confirmation` \| `denied` |
| `error_code` | TEXT | e.g. `timeout`, `invalid`, `unauthorized` |
| `error_msg` | TEXT | message |
| `duration_ms` | INTEGER | tool handler duration |
| `requested_at` | TEXT | ISO8601 — tool handler start |
| `responded_at` | TEXT | ISO8601 — tool handler end |
| `send_at` | TEXT | ISO8601 — when the CLI command was written to the shell |
| `recv_at` | TEXT | ISO8601 — when the response prompt was received |
| `connect_ms` | INTEGER | connect/reconnect time before the command (0 if idle) |
| `output` | TEXT | output excerpt (truncated ~4 KB) |

Indexes: `ts`, `tool_id`.

### `write_audit` — write lifecycle + before/after

| Column | Type | Meaning |
| --- | --- | --- |
| `id` | INTEGER PK | autoincrement |
| `request_id` | INTEGER | FK to `requests.id` (the confirmed execute request) |
| `ts` | TEXT | ISO8601 UTC |
| `tool_id` | TEXT | write tool id |
| `command` | TEXT | exact CLI sent (redacted) |
| `status` | TEXT | `preview` \| `executed` \| `failed` \| `expired` \| `mismatch` \| `denied` |
| `success` | INTEGER | 1/0/NULL |
| `before_snapshot` | TEXT | snapshot read output **before** the write (when `snapshotRead` defined) |
| `after_snapshot` | TEXT | snapshot read output **after** the write |
| `error_code` | TEXT | |
| `error_msg` | TEXT | |
| `commit_status` | TEXT | `ok` \| `failed` \| `skipped` — result of auto `sys commit` |

Index: `ts`.

## Timing

Two levels of timing are recorded (tool-level and router-level):

- `requested_at` / `responded_at` — the full tool call window (includes SSH
  connect if the session had to reconnect).
- `send_at` / `recv_at` — the actual router interaction: when the CLI command
  left the client and when the response prompt came back.
- `connect_ms` — time spent (re)connecting before that command.

`duration_ms = responded_at − requested_at`.

## Redaction

Passwords and secret args (`sys_passwd` old/new, `internet_set` password) are
replaced with `***` in both `command` and `args_json` before writing.

## Useful queries

```bash
sqlite3 data/vigor3912s.db "SELECT ts, tool_id, command, outcome, duration_ms FROM requests ORDER BY id DESC LIMIT 20;"
sqlite3 data/vigor3912s.db "SELECT ts, tool_id, status, success, commit_status FROM write_audit ORDER BY id DESC LIMIT 20;"
sqlite3 data/vigor3912s.db "SELECT tool_id, outcome, COUNT(*) FROM requests GROUP BY tool_id, outcome ORDER BY COUNT(*) DESC LIMIT 20;"
# slowest router responses
sqlite3 data/vigor3912s.db "SELECT tool_id, command, round(julianday(recv_at)-julianday(send_at),3) AS sec FROM requests WHERE recv_at IS NOT NULL ORDER BY sec DESC LIMIT 10;"
```

Logging is best-effort: a log failure never blocks a router command.