/**
 * Detect DrayOS CLI failures that still return a shell prompt (stdout-only errors).
 * Successful acks often start with `% … done` — those must not match.
 */
export function isRouterCliFailure(output: string): boolean {
  const text = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('%')) continue;
    // Explicit failure / invalid forms (not "… done." acks).
    if (/^%%?\s*Invalid\b/i.test(t)) return true;
    if (/^%%?\s*Unknown\b/i.test(t)) return true;
    if (/^%%?\s*Incomplete\b/i.test(t)) return true;
    if (/^%%?\s*Error\b/i.test(t)) return true;
    if (/^%%?\s*Command not found\b/i.test(t)) return true;
    if (/^%\s*Invalid command\b/i.test(t)) return true;
    // Usage / arity errors (e.g. bare `sys name` → "% input wan1/wan2 to set name").
    if (/^%\s*input\b/i.test(t)) return true;
  }
  return false;
}
