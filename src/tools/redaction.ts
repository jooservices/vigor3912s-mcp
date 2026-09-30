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
