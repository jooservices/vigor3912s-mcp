export function logToolCount(
  count: number,
  write: (message: string) => unknown = (message) => process.stderr.write(message),
): void {
  const warning = count > 128 ? ' Warning: more than 128 tools are exposed.' : '';
  write(`Registered ${count} tools.${warning}\n`);
}
