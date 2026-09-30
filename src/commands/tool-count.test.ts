import { describe, expect, it, vi } from 'vitest';
import { logToolCount } from './tool-count.js';

describe('logToolCount', () => {
  it('logs the registered tool count and warns above 128', () => {
    const write = vi.fn();
    logToolCount(129, write);
    expect(write).toHaveBeenCalledWith('Registered 129 tools. Warning: more than 128 tools are exposed.\n');
  });

  it('does not warn when the registered tool count is 128 or fewer', () => {
    const write = vi.fn();
    logToolCount(128, write);
    expect(write).toHaveBeenCalledWith('Registered 128 tools.\n');
  });
});
