const FORBIDDEN = ['sys cfg default', 'sys halt', 'mngt rmtcfg enable', 'linux clean'] as const;

function norm(command: string): string {
  return command.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isForbidden(command: string): boolean {
  return command.split(/\r?\n/).some((line) => {
    const normalized = norm(line);
    return FORBIDDEN.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `),
    );
  });
}
