import { digestCommand } from './approve-crypto.js';
import type { PendingIntentView } from './confirm-gate.js';

export const placeholder = (field: string): string => `<redacted:${field}>`;

/** Replace secret values with named placeholders so a human can re-enter them. */
export function redactCommand(
  command: string,
  args: Record<string, unknown>,
  secretArgs: string[],
): { preview: string; fields: string[] } {
  if (command.includes('<redacted:')) {
    throw Object.assign(new Error('command contains reserved redaction marker'), { code: 'invalid' });
  }
  let out = command;
  const fields: string[] = [];
  const secrets = secretArgs
    .map((key) => ({ key, value: args[key] }))
    .filter(({ value }) => value !== undefined && value !== null && String(value).length > 0)
    .map(({ key, value }) => ({ key, value: String(value) }))
    .sort((a, b) => b.value.length - a.value.length);
  for (const { key, value } of secrets) {
    let replaced = false;
    out = out
      .split(/(<redacted:[^>]*>)/g)
      .map((part, index) => {
        if (index % 2 === 1 || !part.includes(value)) return part;
        replaced = true;
        return part.split(value).join(placeholder(key));
      })
      .join('');
    if (replaced) fields.push(key);
  }
  return { preview: out, fields };
}

/** Deep-clone args with secret values replaced by ***. */
export function redactArgs(args: Record<string, unknown>, secretArgs: string[]): string {
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    clone[k] = secretArgs.includes(k) ? '***' : v;
  }
  return JSON.stringify(clone);
}

export function restoreCommand(preview: string, values: Readonly<Record<string, string>>): string {
  return Object.entries(values).reduce(
    (command, [field, value]) => command.split(placeholder(field)).join(value),
    preview,
  );
}

export function verifyReentry(
  view: PendingIntentView,
  values: Readonly<Record<string, string>>,
): boolean {
  if (view.redactedFields.some((field) => typeof values[field] !== 'string')) return false;
  return digestCommand(restoreCommand(view.commandPreview, values)) === view.commandDigest;
}
