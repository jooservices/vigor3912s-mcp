import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function resolveDataPath(value: string): string {
  if (value === ':memory:' || path.isAbsolute(value)) return value;
  return path.resolve(PACKAGE_ROOT, value);
}
