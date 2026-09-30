import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_ROOT, resolveDataPath } from './paths.js';

describe('data paths', () => {
  it('resolves relative paths from the package root', () => {
    expect(resolveDataPath('data/example.db')).toBe(path.join(PACKAGE_ROOT, 'data/example.db'));
  });

  it('preserves absolute paths and SQLite memory databases', () => {
    expect(resolveDataPath('/tmp/example.db')).toBe('/tmp/example.db');
    expect(resolveDataPath(':memory:')).toBe(':memory:');
  });
});
