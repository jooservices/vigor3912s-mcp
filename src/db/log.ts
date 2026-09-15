import { chmodSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export type RequestOutcome = 'ok' | 'error' | 'needs_confirmation' | 'denied';
export type WriteStatus =
  | 'preview'
  | 'confirmed'
  | 'executed'
  | 'failed'
  | 'expired'
  | 'mismatch'
  | 'denied';

export interface LogEntry {
  ts: string;
  toolId: string;
  kind: 'read' | 'write';
  command: string;
  argsJson: string;
  outcome: RequestOutcome;
  errorCode?: string;
  errorMsg?: string;
  durationMs: number;
  output?: string;
  /** ISO8601 — tool handler start (when the request was made). */
  requestedAt?: string;
  /** ISO8601 — tool handler end (when the response was produced). */
  respondedAt?: string;
  /** ISO8601 — when the CLI command was written to the shell (router-level). */
  sendAt?: string | null;
  /** ISO8601 — when the response prompt was received (router-level). */
  recvAt?: string | null;
  /** connect/reconnect time before the command, ms (0 if idle). */
  connectMs?: number | null;
}

export interface WriteAuditEntry {
  requestId: number | null;
  ts: string;
  toolId: string;
  command: string;
  status: WriteStatus;
  success: boolean | null;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  errorCode?: string;
  errorMsg?: string;
  commitStatus?: 'ok' | 'failed' | 'skipped' | null;
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT    NOT NULL,
  tool_id     TEXT    NOT NULL,
  kind        TEXT    NOT NULL,
  command     TEXT    NOT NULL,
  args_json   TEXT    NOT NULL,
  outcome     TEXT    NOT NULL,
  error_code  TEXT,
  error_msg   TEXT,
  duration_ms INTEGER NOT NULL,
  output      TEXT,
  requested_at TEXT,
  responded_at TEXT,
  send_at      TEXT,
  recv_at      TEXT,
  connect_ms   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_requests_ts ON requests(ts);
CREATE INDEX IF NOT EXISTS idx_requests_tool ON requests(tool_id);
CREATE TABLE IF NOT EXISTS write_audit (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id      INTEGER,
  ts              TEXT    NOT NULL,
  tool_id         TEXT    NOT NULL,
  command         TEXT    NOT NULL,
  status          TEXT    NOT NULL,
  success         INTEGER,
  before_snapshot TEXT,
  after_snapshot  TEXT,
  error_code      TEXT,
  error_msg       TEXT,
  commit_status   TEXT
);
CREATE INDEX IF NOT EXISTS idx_write_audit_ts ON write_audit(ts);
`;

const OUTPUT_LIMIT = 4000;

/** Idempotent column migrations for databases created before a column existed. */
const MIGRATIONS: string[] = [
  'ALTER TABLE write_audit ADD COLUMN commit_status TEXT',
  'ALTER TABLE requests ADD COLUMN requested_at TEXT',
  'ALTER TABLE requests ADD COLUMN responded_at TEXT',
  'ALTER TABLE requests ADD COLUMN send_at TEXT',
  'ALTER TABLE requests ADD COLUMN recv_at TEXT',
  'ALTER TABLE requests ADD COLUMN connect_ms INTEGER',
];

/** Replace secret arg values with *** in a rendered command string. */
export function redactCommand(command: string, args: Record<string, unknown>, secretArgs: string[]): string {
  let out = command;
  for (const key of secretArgs) {
    const value = args[key];
    if (value === undefined || value === null) continue;
    const s = String(value);
    if (s) out = out.split(s).join('***');
  }
  return out;
}

/** Deep-clone args with secret values replaced by ***. */
export function redactArgs(args: Record<string, unknown>, secretArgs: string[]): string {
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    clone[k] = secretArgs.includes(k) ? '***' : v;
  }
  return JSON.stringify(clone);
}

function truncate(text: string, limit = OUTPUT_LIMIT): string {
  return text.length > limit ? `${text.slice(0, limit)}\n...[truncated]` : text;
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * SQLite log store (node:sqlite, built-in). Logging is best-effort: any log
 * failure is swallowed so it can never block a router command. Passwords and
 * secret args are redacted before writing.
 */
export class LogStore {
  private db: DatabaseSync | null = null;

  constructor(file: string) {
    try {
      mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      this.db = new DatabaseSync(file);
      try {
        chmodSync(file, 0o600);
      } catch {
        /* best-effort on platforms that ignore mode */
      }
      this.db.exec(SCHEMA);
      for (const migration of MIGRATIONS) {
        try {
          this.db.exec(migration);
        } catch {
          /* column already exists */
        }
      }
      // Index on the migrated column must be created after the ALTERs.
      try {
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_requests_send ON requests(send_at)');
      } catch {
        /* ignore */
      }
    } catch (err) {
      this.db = null;
      process.stderr.write(
        `vigor3912s-mcp: SQLite log disabled (${err instanceof Error ? err.message : String(err)})\n`,
      );
    }
  }

  logRequest(entry: LogEntry): void {
    if (!this.db) return;
    try {
      this.db
        .prepare(
          `INSERT INTO requests (ts, tool_id, kind, command, args_json, outcome, error_code, error_msg, duration_ms, output, requested_at, responded_at, send_at, recv_at, connect_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entry.ts,
          entry.toolId,
          entry.kind,
          entry.command,
          entry.argsJson,
          entry.outcome,
          entry.errorCode ?? null,
          entry.errorMsg ?? null,
          entry.durationMs,
          entry.output ? truncate(entry.output) : null,
          entry.requestedAt ?? null,
          entry.respondedAt ?? null,
          entry.sendAt ?? null,
          entry.recvAt ?? null,
          entry.connectMs ?? null,
        );
    } catch {
      /* best-effort */
    }
  }

  logWriteAudit(entry: WriteAuditEntry): void {
    if (!this.db) return;
    try {
      this.db
        .prepare(
          `INSERT INTO write_audit (request_id, ts, tool_id, command, status, success, before_snapshot, after_snapshot, error_code, error_msg, commit_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entry.requestId,
          entry.ts,
          entry.toolId,
          entry.command,
          entry.status,
          entry.success === null ? null : entry.success ? 1 : 0,
          entry.beforeSnapshot ? truncate(entry.beforeSnapshot) : null,
          entry.afterSnapshot ? truncate(entry.afterSnapshot) : null,
          entry.errorCode ?? null,
          entry.errorMsg ?? null,
          entry.commitStatus ?? null,
        );
    } catch {
      /* best-effort */
    }
  }

  /** Convenience wrapper for the common single-line request logging. */
  request(args: Omit<LogEntry, 'ts'>): void {
    const now = isoNow();
    this.logRequest({ ...args, ts: now, respondedAt: args.respondedAt ?? now, requestedAt: args.requestedAt ?? now });
  }

  /** Convenience wrapper for write-audit logging. */
  writeAudit(args: Omit<WriteAuditEntry, 'ts'>): void {
    this.logWriteAudit({ ...args, ts: isoNow() });
  }

  get lastRequestId(): number | null {
    if (!this.db) return null;
    try {
      const row = this.db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number };
      return row.id > 0 ? row.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Run a single read-only SELECT (tests / inspection only — not an MCP tool).
   * Rejects multi-statement SQL and non-SELECT statements.
   */
  query<T = Record<string, unknown>>(sql: string, ...params: SQLInputValue[]): T {
    if (!this.db) throw new Error('log store is not available');
    const trimmed = sql.trim();
    if (!/^SELECT\b/i.test(trimmed) || /;/.test(trimmed)) {
      throw new Error('LogStore.query only allows a single SELECT statement');
    }
    const stmt = this.db.prepare(trimmed);
    const rows = stmt.all(...params) as unknown;
    return rows as T;
  }

  close(): void {
    if (!this.db) return;
    try {
      this.db.close();
    } catch {
      /* ignore */
    }
    this.db = null;
  }
}

/** A no-op store used when logging is disabled. */
export const NULL_STORE = new LogStore(':memory:');