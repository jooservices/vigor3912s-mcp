import { z } from 'zod';
import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import { noControl, safeText } from '../../validators.js';

export const userFamily: FamilyDef = {
  family: 'user',
  desc: 'User management.',
  commands: [
    W(
      'user_account',
      'user',
      (a) => `user account ${String(a.userName)} ${String(a.param)}`,
      { userName: noControl(63), param: safeText() },
      'Configure user account (user account <USER_NAME> <flags...>)',
    ),
    W(
      'user_edit',
      'user',
      (a) => `user edit ${String(a.profileIdx)} ${String(a.param)}`,
      {
        profileIdx: z.number().int().min(0),
        param: safeText(),
      },
      'Edit user profile (user edit <PROFILE_IDX> <flags...>)',
    ),
    W(
      'user_set',
      'user',
      (a) => `user set ${String(a.param)}`,
      { param: safeText() },
      'User management general setup (user set <flags...>)',
    ),
    W('user_setdefault', 'user', () => 'user setdefault', {}, 'Reset all user profiles to factory default'),
  ],
};
