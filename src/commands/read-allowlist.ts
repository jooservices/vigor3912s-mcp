import type { z } from 'zod';
import { readCommands } from './registry/index.js';

/**
 * Read-command allowlist for the SSH driver — single source derived from the
 * registry (+ session control strings). Parameterized reads (today: ping /
 * tracert) reuse each command's Zod `host` schema instead of parallel regexes.
 */

const SESSION_EXACT = new Set<string>(['', 'exit']);

const READ_EXACT = new Set<string>([
  ...SESSION_EXACT,
  ...readCommands()
    .filter((c) => Object.keys(c.args).length === 0)
    .map((c) => c.render({})),
]);

interface HostArgMatcher {
  prefix: string;
  hostSchema: z.ZodType<string>;
}

/** Probe render() with a sample host that passes the command's Zod schema. */
const HOST_PROBES = ['0.0.0.0', '::1', '2001:db8::1'] as const;

function buildHostArgMatchers(): HostArgMatcher[] {
  const matchers: HostArgMatcher[] = [];
  for (const cmd of readCommands()) {
    const keys = Object.keys(cmd.args);
    if (keys.length === 0) continue;
    if (keys.length !== 1 || keys[0] !== 'host') {
      throw new Error(
        `read-allowlist: parameterized read "${cmd.id}" must have a single "host" arg (update allowlist)`,
      );
    }
    const hostSchema = cmd.args.host as z.ZodType<string>;
    const sampleHost = HOST_PROBES.find((h) => hostSchema.safeParse(h).success);
    if (!sampleHost) {
      throw new Error(`read-allowlist: no probe host validates for "${cmd.id}"`);
    }
    const rendered = cmd.render({ host: sampleHost });
    if (!rendered.endsWith(sampleHost)) {
      throw new Error(`read-allowlist: render() for "${cmd.id}" does not end with host`);
    }
    matchers.push({
      prefix: rendered.slice(0, -sampleHost.length),
      hostSchema,
    });
  }
  return matchers;
}

const HOST_ARG_MATCHERS = buildHostArgMatchers();

function matchesHostArgRead(command: string): boolean {
  for (const { prefix, hostSchema } of HOST_ARG_MATCHERS) {
    if (!command.startsWith(prefix)) continue;
    const host = command.slice(prefix.length);
    // Reject extra CLI tokens / empty host (injection / smuggling).
    if (!host || /[\s;|&`$]/.test(host)) continue;
    if (hostSchema.safeParse(host).success) return true;
  }
  return false;
}

/** True when `command` is a registered read (or session control), safe for runCommand(). */
export function isAllowedReadCommand(command: string): boolean {
  if (READ_EXACT.has(command)) return true;
  return matchesHostArgRead(command);
}
