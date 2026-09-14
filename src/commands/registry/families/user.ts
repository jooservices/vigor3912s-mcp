import { W } from '../builders.js';
import type { FamilyDef } from '../types.js';
import {
  safeText,
} from '../../validators.js';

export const userFamily: FamilyDef = {
    family: 'user',
    desc: 'User management.',
    commands: [
      W('user_account', 'user', (a) => `user account ${String(a.param)}`, { param: safeText() }, 'Configure user account'),
      W('user_edit', 'user', (a) => `user edit ${String(a.param)}`, { param: safeText() }, 'Edit user profile'),
      W('user_set', 'user', (a) => `user set ${String(a.param)}`, { param: safeText() }, 'Set user management general setup'),
      W('user_setdefault', 'user', () => 'user setdefault', {}, 'Reset all user profiles to factory default'),
    ],
  };
