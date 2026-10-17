export type RouterCliFailureKind =
  | 'invalid'
  | 'unknown'
  | 'incomplete'
  | 'error'
  | 'command-not-found'
  | 'insufficient-arguments'
  | 'usage'
  | 'help-listing';

const FAILURE_PATTERNS: readonly (readonly [RegExp, RouterCliFailureKind])[] = [
  [/^%%?\s*Invalid\b/i, 'invalid'],
  [/^%%?\s*Unknown\b/i, 'unknown'],
  [/^%%?\s*Incomplete\b/i, 'incomplete'],
  [/^%%?\s*Error\b/i, 'error'],
  [/^%%?\s*Command not found\b/i, 'command-not-found'],
  [/^%\s*Insufficient arguments\b/i, 'insufficient-arguments'],
  [/^%\s*input\b/i, 'usage'],
  [/^%\s*Valid (sub)?commands are\b/i, 'help-listing'],
];

/**
 * Classify DrayOS CLI failures that still return a shell prompt (stdout-only
 * errors). Keep these forms aligned with the SDK's commandRejected detector.
 */
export function routerCliFailureKind(output: string): RouterCliFailureKind | undefined {
  const text = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('%')) continue;
    const match = FAILURE_PATTERNS.find(([pattern]) => pattern.test(t));
    if (match) return match[1];
  }
  return undefined;
}

/** True when output contains a DrayOS rejection rather than a result or ack. */
export function isRouterCliFailure(output: string): boolean {
  return routerCliFailureKind(output) !== undefined;
}
