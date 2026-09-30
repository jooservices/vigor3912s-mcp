import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl } from '../../validators.js';

/**
 * Aligns with SDK `UserManageInput`: free-form flag text stays in `param`
 * (SDK YAGNI); tools map 1:1 to action variants of the single `cli.user`
 * operation — each tool pins one `action`, so each binding is partial.
 */
export const userFamily: FamilyDef = {
  family: 'user',
  desc: 'User management.',
  commands: [
    S('user_account', 'user', 'cli.user', 'Configure user account (SDK cli.user action=account)', {
        args: { userName: noControl(63), param: noControl() },
        toInput: (a) => ({ action: 'account', userName: a.userName, param: a.param }),
        partial: true,
      }),
    S('user_edit', 'user', 'cli.user', 'Edit user profile (SDK cli.user action=edit)', {
        args: {
          profileIdx: z.number().int().min(0),
          param: noControl(),
        },
        toInput: (a) => ({ action: 'edit', profileIdx: a.profileIdx, param: a.param }),
        partial: true,
      }),
    S('user_set', 'user', 'cli.user', 'User general setup (SDK cli.user action=set)', {
        args: { param: noControl() },
        toInput: (a) => ({ action: 'set', param: a.param }),
        partial: true,
      }),
    S('user_setdefault', 'user', 'cli.user', 'Reset all user profiles (SDK cli.user action=setdefault)', {
        args: {},
        toInput: () => ({ action: 'setdefault' }),
        partial: true,
      }),
  ],
};
