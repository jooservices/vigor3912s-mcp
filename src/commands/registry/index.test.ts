import { describe, expect, it } from 'vitest';
import { allCommands, attachSdkVoidBindings, findCommand, readCommands, writeCommands } from './index.js';
import type { CommandDef, FamilyDef } from './types.js';

describe('command registry lookup', () => {
  it('resolves and freezes the command arrays once', () => {
    const commands = allCommands();
    expect(allCommands()).toBe(commands);
    expect(Object.isFrozen(commands)).toBe(true);
    expect(readCommands()).toBe(readCommands());
    expect(writeCommands()).toBe(writeCommands());
  });

  it('finds every command by id with the same result as a linear search', () => {
    const commands = allCommands();
    for (const command of commands) {
      expect(findCommand(command.id)).toBe(commands.find((candidate) => candidate.id === command.id));
    }
  });

  it('leaves a void candidate unchanged when rendering throws', () => {
    const command: CommandDef = {
      id: 'broken-render',
      family: 'test',
      kind: 'read',
      desc: 'test command',
      render: () => { throw new Error('render failed'); },
      args: {},
    };
    const family: FamilyDef = { family: 'test', desc: 'test family', commands: [command] };
    expect(attachSdkVoidBindings([family])[0]?.commands[0]).toBe(command);
  });

  it('keeps the reviewed raw void binding exclusion unbound', () => {
    expect(findCommand('local8021x_show_local_cer')?.sdk).toBeUndefined();
  });
});
