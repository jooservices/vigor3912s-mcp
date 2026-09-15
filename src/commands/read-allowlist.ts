import type { z } from 'zod';
import { readCommands } from './registry/index.js';

/**
 * Read-command allowlist for the SSH driver — single source derived from the
 * registry (+ session control strings). Parameterized reads reuse each
 * command's Zod schema:
 * - `host` — ping / tracert
 * - enum / literal args — expanded to exact allowlist entries (cartesian product)
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

const HOST_PROBES = ['0.0.0.0', '::1', '2001:db8::1'] as const;

const OMIT = Symbol('omit-optional-arg');

function extractEnumValues(schema: z.ZodType<unknown>): readonly unknown[] | null {
  const def = (schema as { _def?: { typeName?: string; values?: unknown; value?: unknown; options?: unknown; innerType?: z.ZodType<unknown> } })
    ._def;
  if (!def) return null;
  if (def.typeName === 'ZodOptional' && def.innerType) {
    const inner = extractEnumValues(def.innerType);
    if (!inner) return null;
    return [...inner, OMIT];
  }
  if (def.typeName === 'ZodEnum' && Array.isArray(def.values)) {
    return def.values as readonly unknown[];
  }
  if (def.typeName === 'ZodLiteral') {
    return [def.value];
  }
  if (def.typeName === 'ZodUnion' && Array.isArray(def.options)) {
    const out: unknown[] = [];
    for (const opt of def.options as z.ZodType<unknown>[]) {
      const vals = extractEnumValues(opt);
      if (!vals) return null;
      out.push(...vals);
    }
    return out;
  }
  const opts = (schema as { options?: unknown }).options;
  if (Array.isArray(opts)) return opts;
  return null;
}

function expandArgCombos(
  keys: string[],
  valueLists: readonly (readonly unknown[])[],
): Record<string, unknown>[] {
  let combos: Record<string, unknown>[] = [{}];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const values = valueLists[i]!;
    const next: Record<string, unknown>[] = [];
    for (const base of combos) {
      for (const v of values) {
        if (v === OMIT) {
          next.push({ ...base });
        } else {
          next.push({ ...base, [key]: v });
        }
      }
    }
    combos = next;
  }
  return combos;
}

function buildHostArgMatchers(): HostArgMatcher[] {
  const matchers: HostArgMatcher[] = [];
  for (const cmd of readCommands()) {
    const keys = Object.keys(cmd.args);
    if (keys.length === 0) continue;

    if (keys.length === 1 && keys[0] === 'host') {
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
      continue;
    }

    const valueLists: (readonly unknown[])[] = [];
    for (const key of keys) {
      const schema = cmd.args[key] as z.ZodType<unknown>;
      const values = extractEnumValues(schema);
      if (!values || values.length === 0) {
        throw new Error(
          `read-allowlist: parameterized read "${cmd.id}" arg "${key}" must be Zod enum/literal/union-of-literals or host`,
        );
      }
      for (const value of values) {
        if (typeof value === 'string' && /[\s;|&`$]/.test(value)) {
          throw new Error(`read-allowlist: unsafe enum value for "${cmd.id}"`);
        }
      }
      valueLists.push(values);
    }
    for (const args of expandArgCombos(keys, valueLists)) {
      READ_EXACT.add(cmd.render(args));
    }
  }
  return matchers;
}

const HOST_ARG_MATCHERS = buildHostArgMatchers();

function matchesHostArgRead(command: string): boolean {
  for (const { prefix, hostSchema } of HOST_ARG_MATCHERS) {
    if (!command.startsWith(prefix)) continue;
    const host = command.slice(prefix.length);
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
