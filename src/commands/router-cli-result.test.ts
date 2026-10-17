import { describe, expect, it } from 'vitest';
import { isRouterCliFailure, routerCliFailureKind } from './router-cli-result.js';

describe('isRouterCliFailure', () => {
  it('detects invalid command lines', () => {
    expect(isRouterCliFailure('% Invalid command')).toBe(true);
    expect(isRouterCliFailure('ok\n% Invalid command\n>')).toBe(true);
    expect(isRouterCliFailure('% Unknown command')).toBe(true);
    expect(isRouterCliFailure('%% Error something')).toBe(true);
    expect(isRouterCliFailure('% Incomplete command')).toBe(true);
    expect(isRouterCliFailure('% Command not found')).toBe(true);
    expect(isRouterCliFailure('% Insufficient arguments !!!')).toBe(true);
    expect(isRouterCliFailure('% Valid commands are: show, sys')).toBe(true);
    expect(isRouterCliFailure('% input wan1/wan2 to set name')).toBe(true);
  });

  it.each([
    ['% Invalid command', 'invalid'],
    ['% Unknown command', 'unknown'],
    ['% Incomplete command', 'incomplete'],
    ['%% Error something', 'error'],
    ['% Command not found', 'command-not-found'],
    ['% Insufficient arguments !!!', 'insufficient-arguments'],
    ['% input wan1/wan2 to set name', 'usage'],
    ['% Valid commands are: show, sys', 'help-listing'],
  ] as const)('classifies %s as %s', (output, expected) => {
    expect(routerCliFailureKind(output)).toBe(expected);
  });

  it('does not treat success acks as failures', () => {
    expect(isRouterCliFailure('% TFTP server enabled !!!')).toBe(false);
    expect(isRouterCliFailure('% Set name done.')).toBe(false);
    expect(isRouterCliFailure('')).toBe(false);
  });
});
