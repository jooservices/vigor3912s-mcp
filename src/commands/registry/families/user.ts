import { z } from 'zod';
import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl } from '../../validators.js';

/**
 * Aligns with SDK `UserManageInput`: free-form flag text stays in `param`
 * (SDK YAGNI); tools map 1:1 to action variants.
 */
export const userFamily: FamilyDef = {
  family: 'user',
  desc: 'User management.',
  commands: [
    W(
      'user_account',
      'user',
      (a) => `user account ${String(a.userName)} ${String(a.param)}`,
      { userName: noControl(63), param: noControl() },
      'Configure user account (SDK cli.user action=account)',
    ),
    W(
      'user_edit',
      'user',
      (a) => `user edit ${String(a.profileIdx)} ${String(a.param)}`,
      {
        profileIdx: z.number().int().min(0),
        param: noControl(),
      },
      'Edit user profile (SDK cli.user action=edit)',
    ),
    W(
      'user_set',
      'user',
      (a) => `user set ${String(a.param)}`,
      { param: noControl() },
      'User general setup (SDK cli.user action=set)',
    ),
    W(
      'user_setdefault',
      'user',
      () => 'user setdefault',
      {},
      'Reset all user profiles (SDK cli.user action=setdefault)',
    ),
  ],
};
